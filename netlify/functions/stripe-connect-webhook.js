import Stripe from "stripe";
import { firebaseAdmin, json } from "./_firebase.js";
import { releaseOrderStock } from "./_inventory.js";

const supportedEvents = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.expired",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
];

export default async function (request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const signature = request.headers.get("stripe-signature");
    const stripeEvent = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
    );
    if (!supportedEvents.includes(stripeEvent.type))
      return json(200, { received: true });
    const payment = stripeEvent.data.object;
    const { storeId, orderId } = payment.metadata || {};
    if (!storeId || !orderId) return json(200, { received: true });
    const admin = firebaseAdmin();
    const firestore = admin.firestore();
    const orderRef = firestore.doc(`stores/${storeId}/orders/${orderId}`);
    const shouldReleaseStock = await firestore.runTransaction(async (transaction) => {
      const order = await transaction.get(orderRef);
      if (!order.exists) return;
      const data = order.data();
      const receivedAmount =
        payment.object === "checkout.session"
          ? payment.amount_total
          : payment.amount;
      const validReference =
        data.provider === "stripe" &&
        Number(data.totalCents) === Number(receivedAmount) &&
        (!stripeEvent.account || data.stripeAccountId === stripeEvent.account);
      if (!validReference) {
        transaction.update(orderRef, {
          status: "payment_review",
          validationError:
            "Os dados recebidos da Stripe não conferem com o pedido.",
        });
        return;
      }
      if (stripeEvent.type === "payment_intent.payment_failed") {
        transaction.update(orderRef, {
          status: "payment_failed",
          paymentIntentId: payment.id,
          stripePaymentStatus: payment.status,
          failureCode: payment.last_payment_error?.code || "card_declined",
          failureMessage:
            payment.last_payment_error?.message ||
            "O cartão não foi aprovado pela Stripe.",
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }
      if (stripeEvent.type === "checkout.session.expired") {
        if (data.status === "paid") return false;
        transaction.update(orderRef, {
          status: "expired",
          checkoutSessionId: payment.id,
          failureMessage: "O prazo para concluir o Checkout Stripe expirou.",
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return true;
      }
      const paid =
        stripeEvent.type === "payment_intent.succeeded" ||
        payment.payment_status === "paid";
      if (!paid || data.status === "paid") return;
      transaction.update(orderRef, {
        status: "paid",
        paymentIntentId:
          payment.object === "payment_intent"
            ? payment.id
            : payment.payment_intent,
        ...(payment.object === "checkout.session"
          ? { checkoutSessionId: payment.id }
          : {}),
        stripePaymentStatus: payment.status || payment.payment_status,
        customer: {
          name: payment.customer_details?.name || data.customer?.name || "",
          email: payment.customer_details?.email || data.customer?.email || "",
          phone: payment.customer_details?.phone || data.customer?.phone || "",
        },
        failureCode: admin.firestore.FieldValue.delete(),
        failureMessage: admin.firestore.FieldValue.delete(),
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return false;
    });
    if (shouldReleaseStock)
      await releaseOrderStock({ firestore, orderRef });
    return json(200, { received: true });
  } catch (error) {
    console.error(error);
    return json(400, { error: "Webhook inválido." });
  }
}
