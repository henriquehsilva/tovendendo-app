import Stripe from "stripe";
import { firebaseAdmin, json } from "./_firebase.js";

export default async function (request) {
  if (request.method !== "POST")
    return json(405, { error: "Método não permitido." });
  try {
    const admin = firebaseAdmin(),
      firestore = admin.firestore();
    const token = String(request.headers.get("authorization") || "").replace(
      /^Bearer\s+/i,
      "",
    );
    const user = await admin.auth().verifyIdToken(token);
    const { storeId } = await request.json();
    const storeRef = firestore.doc(`stores/${storeId}`),
      snap = await storeRef.get();
    if (!snap.exists || snap.data().ownerId !== user.uid)
      return json(403, { error: "Loja não autorizada." });
    if (!process.env.STRIPE_SECRET_KEY)
      return json(503, { error: "Stripe não configurada." });
    const stripeKey = process.env.STRIPE_SECRET_KEY.trim();
    const stripeMode = stripeKey.startsWith("sk_test_") ? "test" : "live";
    const payment = snap.data().payment || {};
    const accountId =
      payment.stripeAccountIds?.[stripeMode] ||
      (payment.stripeMode === stripeMode || !payment.stripeMode
        ? payment.stripeAccountId
        : null);
    if (!accountId) return json(200, { connected: false });
    const account = await new Stripe(stripeKey).accounts.retrieve(accountId);
    const connected = Boolean(
      account.charges_enabled && account.details_submitted,
    );
    await storeRef.update({
      "payment.stripeConnected": connected,
      "payment.stripeAccountId": accountId,
      "payment.stripeMode": stripeMode,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return json(200, {
      connected,
      accountId,
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
      disabledReason: account.requirements?.disabled_reason || "",
      currentlyDue: account.requirements?.currently_due || [],
      pendingVerification: account.requirements?.pending_verification || [],
      cardPaymentsCapability: account.capabilities?.card_payments || "inactive",
      mode: stripeMode,
    });
  } catch (error) {
    return json(500, { error: error.message });
  }
}
