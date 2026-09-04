import { firebaseAdmin, json } from "./_firebase.js";
import { cleanCustomer, validCustomer } from "./_orders.js";
import { reserveOrderStock } from "./_inventory.js";

export default async function (request) {
  if (request.method !== "POST") return json(405, { error: "Método não permitido." });
  try {
    const { storeId, items, customer: rawCustomer, installments: requestedInstallments } = await request.json();
    const customer = cleanCustomer(rawCustomer);
    if (!storeId || !Array.isArray(items) || !items.length) return json(400, { error: "Sacola inválida." });
    if (!validCustomer(customer)) return json(400, { error: "Preencha nome, e-mail e WhatsApp válidos." });
    const admin = firebaseAdmin();
    const firestore = admin.firestore();
    const storeSnap = await firestore.doc(`stores/${storeId}`).get();
    if (!storeSnap.exists || !storeSnap.data()?.published) return json(404, { error: "Loja indisponível." });
    const orderRef = firestore.collection(`stores/${storeId}/orders`).doc();
    const reservation = await reserveOrderStock({
      firestore, admin, storeId, requestedItems: items, orderRef,
      orderData: {
        customer,
        status: "pending_confirmation",
        provider: "delivery",
        paymentMethod: "card_on_delivery",
      },
    });
    const maximumInstallments = Math.max(1, ...reservation.products.map(({ data }) => Math.min(24, Math.max(1, Math.floor(Number(data.installments)) || 1))));
    const installments = Math.min(maximumInstallments, Math.max(1, Math.floor(Number(requestedInstallments)) || 1));
    await orderRef.update({ installments });
    return json(200, { orderId: orderRef.id, total: reservation.totalCents / 100, installments });
  } catch (error) {
    console.error(error);
    return json(400, { error: error.message || "Não foi possível registrar o pedido." });
  }
}
