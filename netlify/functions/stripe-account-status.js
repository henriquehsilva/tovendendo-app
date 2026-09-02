import Stripe from "stripe";
import { firebaseAdmin, json } from "./_firebase.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST")
    return json(405, { error: "Método não permitido." });
  try {
    const admin = firebaseAdmin(),
      firestore = admin.firestore();
    const token = String(event.headers.authorization || "").replace(
      /^Bearer\s+/i,
      "",
    );
    const user = await admin.auth().verifyIdToken(token);
    const { storeId } = JSON.parse(event.body || "{}");
    const storeRef = firestore.doc(`stores/${storeId}`),
      snap = await storeRef.get();
    if (!snap.exists || snap.data().ownerId !== user.uid)
      return json(403, { error: "Loja não autorizada." });
    const accountId = snap.data().payment?.stripeAccountId;
    if (!accountId) return json(200, { connected: false });
    const account = await new Stripe(
      process.env.STRIPE_SECRET_KEY,
    ).accounts.retrieve(accountId);
    const connected = Boolean(
      account.charges_enabled && account.details_submitted,
    );
    await storeRef.update({
      "payment.stripeConnected": connected,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return json(200, {
      connected,
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted,
    });
  } catch (error) {
    return json(500, { error: error.message });
  }
};
