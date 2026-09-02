import Stripe from "stripe";
import { firebaseAdmin, json } from "./_firebase.js";

export default async function (request) {
  if (request.method !== "POST")
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
    const idToken = String(request.headers.get("authorization") || "").replace(
      /^Bearer\s+/i,
      "",
    );
    const user = await admin.auth().verifyIdToken(idToken);
    const { storeId } = await request.json();
    const storeRef = firestore.doc(`stores/${storeId}`),
      storeSnap = await storeRef.get();
    if (!storeSnap.exists || storeSnap.data().ownerId !== user.uid)
      return json(403, { error: "Loja não autorizada." });
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY.trim();
    const stripeMode = stripeSecretKey.startsWith("sk_test_") ? "test" : "live";
    const stripe = new Stripe(stripeSecretKey);
    const payment = storeSnap.data().payment || {};
    let accountId =
      payment.stripeAccountIds?.[stripeMode] ||
      (payment.stripeMode === stripeMode ? payment.stripeAccountId : null);
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "BR",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
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
            ...payment,
            stripeAccountId: accountId,
            stripeAccountIds: {
              ...(payment.stripeAccountIds || {}),
              [stripeMode]: accountId,
            },
            stripeMode,
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
    const origin = process.env.APP_URL || request.headers.get("origin");
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/admin?stripe=refresh`,
      return_url: `${origin}/admin?stripe=return`,
      type: "account_onboarding",
    });
    return json(200, { onboardingUrl: link.url, mode: stripeMode });
  } catch (error) {
    console.error(error);
    if (
      String(error?.message || "").includes(
        "complete your platform profile to use Connect",
      )
    )
      return json(403, {
        error:
          "A Stripe está em modo produção, mas ainda não aprovou o perfil Connect da plataforma. Para testar agora, configure STRIPE_SECRET_KEY com uma chave sk_test_... da mesma conta Stripe.",
      });
    return json(500, {
      error: error.message || "Não foi possível abrir o cadastro Stripe.",
    });
  }
}
