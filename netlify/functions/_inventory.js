import {
  discountPercent,
  discountedPriceInCents,
  priceInCents,
  safeQuantity,
} from "./_orders.js";

export const requestedProducts = (items) => {
  const quantities = new Map();
  for (const item of items || []) {
    const id = String(item?.id || "").trim();
    if (!id) throw new Error("Produto inválido na sacola.");
    quantities.set(id, (quantities.get(id) || 0) + safeQuantity(item.quantity));
  }
  return [...quantities].map(([id, quantity]) => ({ id, quantity }));
};

export const finiteStock = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return Math.max(0, Math.floor(Number(value) || 0));
};

export async function reserveOrderStock({
  firestore,
  admin,
  storeId,
  requestedItems,
  orderRef,
  orderData,
}) {
  const requested = requestedProducts(requestedItems);
  if (!requested.length) throw new Error("Sacola inválida.");
  return firestore.runTransaction(async (transaction) => {
    const products = [];
    for (const item of requested) {
      const ref = firestore.doc(`stores/${storeId}/products/${item.id}`);
      const snapshot = await transaction.get(ref);
      const data = snapshot.data();
      const stock = finiteStock(data?.stock);
      const originalUnitPriceCents = priceInCents(data?.price);
      const appliedDiscount = discountPercent(data?.cashbackPercent);
      const unitPriceCents = discountedPriceInCents(
        data?.price,
        appliedDiscount,
      );
      if (
        !snapshot.exists ||
        data.unavailable === true ||
        data.active === false ||
        !Number.isSafeInteger(originalUnitPriceCents) ||
        !Number.isSafeInteger(unitPriceCents) ||
        unitPriceCents <= 0
      )
        throw new Error(`${data?.name || "Um produto"} está indisponível.`);
      if (stock !== null && item.quantity > stock)
        throw new Error(
          stock
            ? `Há apenas ${stock} unidade(s) de ${data.name} disponível(is).`
            : `${data.name} está sem estoque.`,
        );
      products.push({
        ref,
        id: snapshot.id,
        data,
        quantity: item.quantity,
        stock,
        unitPriceCents,
        originalUnitPriceCents,
        appliedDiscount,
      });
    }
    const items = products.map((product) => ({
      productId: product.id,
      name: product.data.name,
      quantity: product.quantity,
      unitPrice: product.unitPriceCents / 100,
      originalUnitPrice: product.originalUnitPriceCents / 100,
      discountPercent: product.appliedDiscount,
    }));
    const totalCents = products.reduce(
      (total, product) => total + product.unitPriceCents * product.quantity,
      0,
    );
    products.forEach((product) => {
      if (product.stock !== null)
        transaction.update(product.ref, {
          stock: product.stock - product.quantity,
        });
    });
    transaction.set(orderRef, {
      ...orderData,
      items,
      total: totalCents / 100,
      totalCents,
      stockReserved: products.some((product) => product.stock !== null),
      stockReservations: products
        .filter((product) => product.stock !== null)
        .map((product) => ({
          productId: product.id,
          quantity: product.quantity,
        })),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {
      items,
      totalCents,
      products: products.map((product) => ({
        id: product.id,
        data: product.data,
        quantity: product.quantity,
        unitPriceCents: product.unitPriceCents,
      })),
    };
  });
}

export async function releaseOrderStock({ firestore, orderRef }) {
  await firestore.runTransaction(async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    const order = orderSnap.data();
    if (!orderSnap.exists || !order.stockReserved || order.stockReleased) return;
    const productEntries = [];
    for (const item of order.stockReservations || []) {
      const ref = firestore.doc(
        `${orderRef.parent.parent.path}/products/${item.productId}`,
      );
      const snapshot = await transaction.get(ref);
      if (snapshot.exists) productEntries.push({ ref, snapshot, item });
    }
    productEntries.forEach(({ ref, snapshot, item }) =>
      transaction.update(ref, {
        stock:
          Math.max(0, Math.floor(Number(snapshot.data().stock) || 0)) +
          Number(item.quantity || 0),
      }),
    );
    transaction.update(orderRef, { stockReleased: true });
  });
}
