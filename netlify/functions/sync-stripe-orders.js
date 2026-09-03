import Stripe from "stripe";
import { firebaseAdmin, json } from "./_firebase.js";

export default async function (request) {
  if (request.method !== "POST")
    return json(405, { error: "Método não permitido." });
  try {
    if (!process.env.STRIPE_SECRET_KEY)
      return json(503, { error: "Stripe não configurada." });
    const admin = firebaseAdmin();
    const firestore = admin.firestore();
    const token = String(request.headers.get("authorization") || "").replace(
      /^Bearer\s+/i,
      "",
    );
    const user = await admin.auth().verifyIdToken(token);
    const { storeId } = await request.json();
    const storeSnap = await firestore.doc(`stores/${storeId}`).get();
    if (!storeSnap.exists || storeSnap.data().ownerId !== user.uid)
      return json(403, { error: "Loja não autorizada." });

    const stripeKey = process.env.STRIPE_SECRET_KEY.trim();
    const stripeMode = stripeKey.startsWith("sk_test_") ? "test" : "live";
    const store = storeSnap.data();
    const defaultAccountId =
      store.payment?.stripeAccountIds?.[stripeMode] ||
      store.payment?.stripeAccountId;
    const ordersSnap = await firestore
      .collection(`stores/${storeId}/orders`)
      .get();
    const pendingOrders = ordersSnap.docs
      .filter(
        (order) =>
          order.data().provider === "stripe" &&
          order.data().status !== "paid" &&
          order.data().checkoutSessionId,
      )
      .slice(0, 50);
    const stripe = new Stripe(stripeKey);
    let updated = 0;

    for (const order of pendingOrders) {
      const data = order.data();
      const accountId = data.stripeAccountId || defaultAccountId;
      if (!accountId) continue;
      try {
        const session = await stripe.checkout.sessions.retrieve(
          data.checkoutSessionId,
          { expand: ["payment_intent"] },
          { stripeAccount: accountId },
        );
        const intent = session.payment_intent;
        const intentData =
          intent && typeof intent === "object" ? intent : undefined;
        const changes = {
          stripeAccountId: accountId,
          stripePaymentStatus: session.payment_status,
          syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (session.payment_status === "paid") {
          changes.status = "paid";
          changes.paymentIntentId = intentData?.id || intent || null;
          changes.paidAt = admin.firestore.FieldValue.serverTimestamp();
          changes.customer = {
            name: session.customer_details?.name || data.customer?.name || "",
            email:
              session.customer_details?.email || data.customer?.email || "",
            phone:
              session.customer_details?.phone || data.customer?.phone || "",
          };
          changes.failureCode = admin.firestore.FieldValue.delete();
          changes.failureMessage = admin.firestore.FieldValue.delete();
        } else if (session.status === "expired") {
          changes.status = "expired";
          changes.failureMessage =
            "O prazo para concluir o Checkout Stripe expirou.";
        } else if (intentData?.last_payment_error) {
          changes.status = "payment_failed";
          changes.paymentIntentId = intentData.id;
          changes.failureCode =
            intentData.last_payment_error.code || "card_declined";
          changes.failureMessage =
            intentData.last_payment_error.message ||
            "O cartão não foi aprovado pela Stripe.";
        } else {
          changes.status = "pending";
        }
        await order.ref.update(changes);
        updated += 1;
      } catch (error) {
        console.error(
          `Falha ao sincronizar pedido ${order.id}:`,
          error.message,
        );
      }
    }
    return json(200, { checked: pendingOrders.length, updated });
  } catch (error) {
    console.error(error);
    return json(400, {
      error: error.message || "Não foi possível sincronizar a Stripe.",
    });
  }
}
