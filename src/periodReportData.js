const asDate = (value) => {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const localBoundary = (value, endOfDay = false) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
};

export const orderTotal = (order) =>
  Number(
    order.total ??
      (order.items || []).reduce(
        (sum, item) =>
          sum + Number(item.unitPrice || 0) * Number(item.quantity || 0),
        0,
      ),
  ) || 0;

export const paidOrdersInPeriod = (orders, start, end) => {
  const from = localBoundary(start);
  const through = localBoundary(end, true);
  if (!from || !through || from > through) return [];
  return orders
    .filter((order) => {
      const date = asDate(order.paidAt) || asDate(order.createdAt);
      return order.status === "paid" && date && date >= from && date <= through;
    })
    .sort(
      (a, b) =>
        (asDate(a.paidAt) || asDate(a.createdAt)) -
        (asDate(b.paidAt) || asDate(b.createdAt)),
    );
};

export const periodSummary = (orders) =>
  orders.reduce(
    (summary, order) => {
      const total = orderTotal(order);
      summary.total += total;
      summary.items += (order.items || []).reduce(
        (amount, item) => amount + Number(item.quantity || 0),
        0,
      );
      summary[order.provider === "pix" ? "pix" : "card"] += total;
      return summary;
    },
    { total: 0, pix: 0, card: 0, items: 0 },
  );
