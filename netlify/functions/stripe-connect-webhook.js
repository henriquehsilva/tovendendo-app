import Stripe from "stripe";
import { firebaseAdmin, json } from "./_firebase.js";

export default async function (request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const signature = request.headers.get("stripe-signature");
    const stripeEvent = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
    );
    if (stripeEvent.type !== "checkout.session.completed")
      return json(200, { received: true });
    const session = stripeEvent.data.object,
      { storeId, orderId } = session.metadata || {};
    if (!storeId || !orderId) return json(200, { received: true });
    const admin = firebaseAdmin(),
      firestore = admin.firestore(),
      orderRef = firestore.doc(`stores/${storeId}/orders/${orderId}`);
    await firestore.runTransaction(async (transaction) => {
      const order = await transaction.get(orderRef);
      if (!order.exists || order.data().status === "paid") return;
      transaction.update(orderRef, {
        status: "paid",
        paymentIntentId: session.payment_intent,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      for (const item of order.data().items)
        transaction.update(
          firestore.doc(`stores/${storeId}/products/${item.productId}`),
          { stock: admin.firestore.FieldValue.increment(-item.quantity) },
        );
    });
    return json(200, { received: true });
  } catch (error) {
    console.error(error);
    return json(400, { error: "Webhook inválido." });
  }
}
