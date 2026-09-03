import Stripe from "stripe";
import { firebaseAdmin, json } from "./_firebase.js";
import {
  cleanCustomer,
  plainProductDescription,
  validCustomer,
} from "./_orders.js";
import { releaseOrderStock, reserveOrderStock } from "./_inventory.js";

export default async function (request) {
  if (request.method !== "POST")
    return json(405, { error: "Método não permitido." });
  let reservedOrderRef;
  let reservedFirestore;
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
    const orderRef = firestore.collection(`stores/${storeId}/orders`).doc();
    const reservation = await reserveOrderStock({
      firestore,
      admin,
      storeId,
      requestedItems: items,
      orderRef,
      orderData: {
        customer,
        status: "pending",
        provider: "stripe",
        stripeAccountId: accountId,
      },
    });
    reservedOrderRef = orderRef;
    reservedFirestore = firestore;
    const { totalCents } = reservation;
    const lineItems = reservation.products.map((product) => ({
        quantity: product.quantity,
        price_data: {
          currency: "brl",
          unit_amount: product.unitPriceCents,
          product_data: {
            name: product.data.name,
            description: plainProductDescription(product.data.description).slice(0, 500),
            images: (product.data.imageUrls?.length ? product.data.imageUrls : [product.data.imageUrl])
              .filter((url) => /^https:\/\//.test(url || ""))
              .slice(0, 8),
          },
        },
      }));
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
    reservedOrderRef = null;
    return json(200, { checkoutUrl: session.url });
  } catch (error) {
    if (reservedOrderRef && reservedFirestore) {
      try {
        await releaseOrderStock({
          firestore: reservedFirestore,
          orderRef: reservedOrderRef,
        });
      } catch (releaseError) {
        console.error("Falha ao devolver estoque:", releaseError);
      }
    }
    console.error(error);
    return json(400, {
      error: error.message || "Não foi possível abrir o pagamento.",
    });
  }
}
