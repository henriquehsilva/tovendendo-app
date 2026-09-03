import { firebaseAdmin, json } from "./_firebase.js";
import {
  cleanCustomer,
  priceInCents,
  safeQuantity,
  validCustomer,
} from "./_orders.js";

export default async function (request) {
  if (request.method !== "POST")
    return json(405, { error: "Método não permitido." });
  try {
    const { storeId, items, customer: rawCustomer } = await request.json();
    const customer = cleanCustomer(rawCustomer);
    if (!storeId || !Array.isArray(items) || !items.length)
      return json(400, { error: "Sacola inválida." });
    if (!validCustomer(customer))
      return json(400, { error: "Preencha nome, e-mail e WhatsApp válidos." });

    const admin = firebaseAdmin();
    const firestore = admin.firestore();
    const storeSnap = await firestore.doc(`stores/${storeId}`).get();
    const store = storeSnap.data();
    if (!storeSnap.exists || !store?.published || !store.payment?.enabled)
      return json(404, { error: "Pagamento Pix indisponível." });

    const orderItems = [];
    let totalCents = 0;
    for (const requested of items) {
      const product = await firestore
        .doc(`stores/${storeId}/products/${requested.id}`)
        .get();
      const data = product.data();
      const quantity = safeQuantity(requested.quantity);
      const unitPriceCents = priceInCents(data?.price);
      if (
        !product.exists ||
        data.unavailable === true ||
        data.active === false ||
        !Number.isSafeInteger(unitPriceCents) ||
        unitPriceCents <= 0
      )
        throw new Error(`${data?.name || "Um produto"} está indisponível.`);
      totalCents += unitPriceCents * quantity;
      orderItems.push({
        productId: product.id,
        name: data.name,
        quantity,
        unitPrice: unitPriceCents / 100,
      });
    }

    const orderRef = firestore.collection(`stores/${storeId}/orders`).doc();
    await orderRef.set({
      items: orderItems,
      customer,
      total: totalCents / 100,
      totalCents,
      status: "pending_confirmation",
      provider: "pix",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return json(200, { orderId: orderRef.id, total: totalCents / 100 });
  } catch (error) {
    console.error(error);
    return json(400, {
      error: error.message || "Não foi possível criar o pedido Pix.",
    });
  }
}
