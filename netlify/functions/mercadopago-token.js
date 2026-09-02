import { firebaseAdmin, json } from "./_firebase.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST")
    return json(405, { error: "Método não permitido." });
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64)
      return json(503, {
        error:
          "Configure FIREBASE_SERVICE_ACCOUNT_BASE64 nas variáveis da Netlify antes de conectar uma conta.",
      });
    const admin = firebaseAdmin();
    const idToken = String(event.headers.authorization || "").replace(
      /^Bearer\s+/i,
      "",
    );
    const user = await admin.auth().verifyIdToken(idToken);
    const { storeId, accessToken } = JSON.parse(event.body || "{}");
    if (!storeId || !String(accessToken || "").trim())
      return json(400, { error: "Loja e Access Token são obrigatórios." });
    const storeRef = admin.firestore().doc(`stores/${storeId}`);
    const store = await storeRef.get();
    if (!store.exists || store.data().ownerId !== user.uid)
      return json(403, { error: "Você não pode configurar esta loja." });
    const validation = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${String(accessToken).trim()}` },
    });
    const merchant = await validation.json();
    if (!validation.ok || !merchant.id)
      return json(400, {
        error: "Access Token inválido ou sem acesso à conta Mercado Pago.",
      });
    const batch = admin.firestore().batch();
    batch.set(
      admin.firestore().doc(`mercadoPagoConnections/${storeId}`),
      {
        ownerId: user.uid,
        accessToken: String(accessToken).trim(),
        userId: String(merchant.id),
        connectionType: "access_token",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    batch.set(
      storeRef,
      {
        payment: {
          ...store.data().payment,
          connected: true,
          enabled: true,
          merchantUserId: String(merchant.id),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await batch.commit();
    return json(200, { connected: true, merchantUserId: String(merchant.id) });
  } catch (error) {
    console.error("Falha ao conectar Mercado Pago:", error);
    return json(500, {
      error: error.message || "Não foi possível conectar o Mercado Pago.",
    });
  }
};
