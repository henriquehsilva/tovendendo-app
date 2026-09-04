import { firebaseAdmin, json } from "./_firebase.js";
import { releaseOrderStock } from "./_inventory.js";

export default async function (request) {
  if (request.method !== "POST") return json(405, { error: "Método não permitido." });
  try {
    const admin = firebaseAdmin();
    const firestore = admin.firestore();
    const token = String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const user = await admin.auth().verifyIdToken(token);
    const { storeId, orderId } = await request.json();
    const storeRef = firestore.doc(`stores/${storeId}`);
    const orderRef = firestore.doc(`stores/${storeId}/orders/${orderId}`);
    const [storeSnap, orderSnap] = await Promise.all([storeRef.get(), orderRef.get()]);
    if (!storeSnap.exists || storeSnap.data().ownerId !== user.uid) return json(403, { error: "Loja não autorizada." });
    if (!orderSnap.exists || !["pix", "delivery"].includes(orderSnap.data().provider)) return json(404, { error: "Pedido não encontrado." });
    const order = orderSnap.data();
    if (["cancelled", "refunded"].includes(order.status)) return json(200, { refunded: true, status: order.status });
    await releaseOrderStock({ firestore, orderRef });
    const status = order.status === "paid" ? "refunded" : "cancelled";
    await orderRef.update({ status, refundedAt: admin.firestore.FieldValue.serverTimestamp(), refundedBy: user.uid });
    return json(200, { refunded: true, status });
  } catch (error) {
    console.error(error);
    return json(400, { error: error.message || "Não foi possível estornar o pedido." });
  }
}
