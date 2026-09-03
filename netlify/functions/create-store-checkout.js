import Stripe from "stripe";
import { firebaseAdmin, json } from "./_firebase.js";
import {
  cleanCustomer,
  plainProductDescription,
  priceInCents,
  safeQuantity,
  validCustomer,
} from "./_orders.js";

export default async function (request) {
  if (request.method !== "POST")
    return json(405, { error: "Método não permitido." });
  try {
    const { storeId, items, customer: rawCustomer } = await request.json();
    const customer = cleanCustomer(rawCustomer);
    if (!storeId || !Array.isArray(items) || !items.length)
      return json(400, { error: "Sacola inválida." });
    if (!validCustomer(customer))
      return json(400, { error: "Preencha nome, e-mail e WhatsApp válidos." });
    const admin = firebaseAdmin(),
      firestore = admin.firestore(),
      storeSnap = await firestore.doc(`stores/${storeId}`).get();
    if (!storeSnap.exists || !storeSnap.data().published)
      return json(404, { error: "Loja não encontrada." });
    if (!process.env.STRIPE_SECRET_KEY)
      return json(503, { error: "Pagamentos Stripe não configurados." });
    const store = storeSnap.data(),
      stripeKey = process.env.STRIPE_SECRET_KEY.trim(),
      stripeMode = stripeKey.startsWith("sk_test_") ? "test" : "live",
      payment = store.payment || {},
      accountId =
        payment.stripeAccountIds?.[stripeMode] ||
        (payment.stripeMode === stripeMode || !payment.stripeMode
          ? payment.stripeAccountId
          : null);
    if (!accountId)
      return json(409, {
        error: "Esta loja ainda não ativou cartão e carteira digital.",
      });
    const stripe = new Stripe(stripeKey),
      account = await stripe.accounts.retrieve(accountId);
    if (!account.charges_enabled)
      return json(409, {
        error: account.requirements?.currently_due?.length
          ? "O cadastro Stripe da loja ainda possui dados pendentes. O lojista deve abrir o painel e concluir a configuração da conta."
          : account.requirements?.pending_verification?.length
            ? "A Stripe está verificando os dados desta loja. O pagamento por cartão será liberado após a análise."
            : "A Stripe ainda não habilitou cobranças nesta conta da loja.",
      });
    const lineItems = [],
      orderItems = [];
    let totalCents = 0;
    for (const requested of items) {
      const product = await firestore
          .doc(`stores/${storeId}/products/${requested.id}`)
          .get(),
        data = product.data(),
        quantity = safeQuantity(requested.quantity);
      if (!product.exists || data.unavailable === true || data.active === false)
        throw new Error(`${data?.name || "Um produto"} está indisponível.`);
      const unitPriceCents = priceInCents(data.price);
      if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents <= 0)
        throw new Error(`${data.name || "Um produto"} possui preço inválido.`);
      totalCents += unitPriceCents * quantity;
      lineItems.push({
        quantity,
        price_data: {
          currency: "brl",
          unit_amount: unitPriceCents,
          product_data: {
            name: data.name,
            description: plainProductDescription(data.description).slice(0, 500),
            images: (data.imageUrls?.length ? data.imageUrls : [data.imageUrl])
              .filter((url) => /^https:\/\//.test(url || ""))
              .slice(0, 8),
          },
        },
      });
      orderItems.push({
        productId: product.id,
        name: data.name,
        quantity,
        unitPrice: unitPriceCents / 100,
      });
    }
    const orderRef = firestore.collection(`stores/${storeId}/orders`).doc();
    await orderRef.set({
      items: orderItems,
      customer,
      total: totalCents / 100,
      totalCents,
      status: "pending",
      provider: "stripe",
      stripeAccountId: accountId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const origin = process.env.APP_URL || request.headers.get("origin");
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: lineItems,
        success_url: `${origin}/loja/${store.slug}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/loja/${store.slug}?payment=cancelled`,
        customer_creation: "always",
        customer_email: customer.email,
        phone_number_collection: { enabled: true },
        metadata: { storeId, orderId: orderRef.id },
        payment_intent_data: {
          metadata: { storeId, orderId: orderRef.id },
        },
      },
      { stripeAccount: accountId },
    );
    await orderRef.update({ checkoutSessionId: session.id });
    return json(200, { checkoutUrl: session.url });
  } catch (error) {
    console.error(error);
    return json(400, {
      error: error.message || "Não foi possível abrir o pagamento.",
    });
  }
}
