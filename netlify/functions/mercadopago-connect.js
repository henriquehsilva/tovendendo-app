import crypto from "node:crypto";
import { firebaseAdmin, json } from "./_firebase.js";

const sign = (value) =>
  crypto
    .createHmac("sha256", process.env.MERCADO_PAGO_OAUTH_STATE_SECRET)
    .update(value)
    .digest("hex");

export const handler = async (event) => {
  if (event.httpMethod !== "POST")
    return json(405, { error: "Método não permitido." });
  try {
    const missing = [
      "FIREBASE_SERVICE_ACCOUNT_BASE64",
      "MERCADO_PAGO_CLIENT_ID",
      "MERCADO_PAGO_CLIENT_SECRET",
      "MERCADO_PAGO_OAUTH_STATE_SECRET",
      "APP_URL",
    ].filter((key) => !process.env[key]);
    if (missing.length)
      return json(503, {
        error:
          "A conexão com o Mercado Pago ainda não foi habilitada pela plataforma.",
        code: "MERCADO_PAGO_NOT_CONFIGURED",
      });
    const admin = firebaseAdmin();
    const token = String(event.headers.authorization || "").replace(
      /^Bearer\s+/i,
      "",
    );
    const user = await admin.auth().verifyIdToken(token);
    const { storeId } = JSON.parse(event.body || "{}");
    const storeRef = admin.firestore().doc(`stores/${storeId}`);
    const store = await storeRef.get();
    if (!store.exists || store.data().ownerId !== user.uid)
      return json(403, { error: "Loja não autorizada." });
    const payload = Buffer.from(
      JSON.stringify({
        storeId,
        uid: user.uid,
        exp: Date.now() + 10 * 60 * 1000,
      }),
    ).toString("base64url");
    const state = `${payload}.${sign(payload)}`;
    const appUrl = process.env.APP_URL || event.headers.origin;
    const redirectUri = `${appUrl}/.netlify/functions/mercadopago-callback`;
    const params = new URLSearchParams({
      client_id: process.env.MERCADO_PAGO_CLIENT_ID,
      response_type: "code",
      platform_id: "mp",
      state,
      redirect_uri: redirectUri,
    });
    return json(200, {
      authorizationUrl: `https://auth.mercadopago.com.br/authorization?${params}`,
    });
  } catch (error) {
    return json(500, { error: error.message });
  }
};
