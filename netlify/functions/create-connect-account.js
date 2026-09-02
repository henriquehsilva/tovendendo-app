import Stripe from "stripe";
import { firebaseAdmin, json } from "./_firebase.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST")
    return json(405, { error: "Método não permitido." });
  try {
    if (
      !process.env.STRIPE_SECRET_KEY ||
      !process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
    )
      return json(503, {
        error:
          "Pagamentos digitais ainda não foram configurados pela plataforma.",
      });
    const admin = firebaseAdmin(),
      firestore = admin.firestore();
    const idToken = String(event.headers.authorization || "").replace(
      /^Bearer\s+/i,
      "",
    );
    const user = await admin.auth().verifyIdToken(idToken);
    const { storeId } = JSON.parse(event.body || "{}");
    const storeRef = firestore.doc(`stores/${storeId}`),
      storeSnap = await storeRef.get();
    if (!storeSnap.exists || storeSnap.data().ownerId !== user.uid)
      return json(403, { error: "Loja não autorizada." });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    let accountId = storeSnap.data().payment?.stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "BR",
        email: user.email,
        business_profile: {
          name: storeSnap.data().brand,
          url: storeSnap.data().published
            ? `${process.env.APP_URL}/loja/${storeSnap.data().slug}`
            : undefined,
        },
        metadata: { storeId, ownerId: user.uid },
      });
      accountId = account.id;
      await storeRef.set(
        {
          payment: {
            ...storeSnap.data().payment,
            stripeAccountId: accountId,
            stripeConnected: false,
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
    const existingAccount = await stripe.accounts.retrieve(accountId);
    if (existingAccount.charges_enabled && existingAccount.details_submitted) {
      const login = await stripe.accounts.createLoginLink(accountId);
      return json(200, { onboardingUrl: login.url, connected: true });
    }
    const origin = process.env.APP_URL || event.headers.origin;
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/admin?stripe=refresh`,
      return_url: `${origin}/admin?stripe=return`,
      type: "account_onboarding",
    });
    return json(200, { onboardingUrl: link.url });
  } catch (error) {
    console.error(error);
    return json(500, {
      error: error.message || "Não foi possível abrir o cadastro Stripe.",
    });
  }
};
