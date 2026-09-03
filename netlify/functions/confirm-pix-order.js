import { firebaseAdmin, json } from "./_firebase.js";

export default async function (request) {
  if (request.method !== "POST")
    return json(405, { error: "Método não permitido." });
  try {
    const admin = firebaseAdmin();
    const firestore = admin.firestore();
    const token = String(request.headers.get("authorization") || "").replace(
      /^Bearer\s+/i,
      "",
    );
    const user = await admin.auth().verifyIdToken(token);
    const { storeId, orderId } = await request.json();
    const storeRef = firestore.doc(`stores/${storeId}`);
    const orderRef = firestore.doc(`stores/${storeId}/orders/${orderId}`);
    const [storeSnap, orderSnap] = await Promise.all([
      storeRef.get(),
      orderRef.get(),
    ]);
    if (!storeSnap.exists || storeSnap.data().ownerId !== user.uid)
      return json(403, { error: "Loja não autorizada." });
    if (!orderSnap.exists || orderSnap.data().provider !== "pix")
      return json(404, { error: "Pedido Pix não encontrado." });
    if (orderSnap.data().status !== "paid")
      await orderRef.update({
        status: "paid",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        confirmedBy: user.uid,
      });
    return json(200, { confirmed: true });
  } catch (error) {
    console.error(error);
    return json(400, {
      error: error.message || "Não foi possível confirmar o Pix.",
    });
  }
}
