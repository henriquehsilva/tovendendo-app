import test from "node:test";
import assert from "node:assert/strict";
import {
  orderTotal,
  paidOrdersInPeriod,
  periodSummary,
} from "../src/periodReportData.js";

const orders = [
  {
    id: "paid-pix",
    status: "paid",
    provider: "pix",
    createdAt: "2026-09-01T12:00:00-03:00",
    total: 25,
    items: [{ quantity: 2, unitPrice: 12.5 }],
  },
  {
    id: "paid-card",
    status: "paid",
    provider: "stripe",
    createdAt: "2026-09-03T23:30:00-03:00",
    items: [{ quantity: 1, unitPrice: 40 }],
  },
  {
    id: "pending",
    status: "pending_confirmation",
    provider: "pix",
    createdAt: "2026-09-02T12:00:00-03:00",
    total: 99,
  },
];

test("filtra somente vendas pagas dentro dos dias inclusivos", () => {
  assert.deepEqual(
    paidOrdersInPeriod(orders, "2026-09-01", "2026-09-03").map(
      (order) => order.id,
    ),
    ["paid-pix", "paid-card"],
  );
});

test("calcula totais do fechamento por meio de pagamento", () => {
  const included = paidOrdersInPeriod(orders, "2026-09-01", "2026-09-03");
  assert.equal(orderTotal(orders[1]), 40);
  assert.deepEqual(periodSummary(included), {
    total: 65,
    pix: 25,
    card: 40,
    items: 3,
  });
});

test("rejeita período invertido", () => {
  assert.deepEqual(paidOrdersInPeriod(orders, "2026-09-04", "2026-09-01"), []);
});
