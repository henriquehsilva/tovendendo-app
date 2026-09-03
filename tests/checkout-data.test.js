import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanCustomer,
  discountedPriceInCents,
  plainProductDescription,
  priceInCents,
  safeQuantity,
  validCustomer,
} from "../netlify/functions/_orders.js";

test("normaliza e valida os dados do cliente", () => {
  const customer = cleanCustomer({
    name: "  Maria   Silva ",
    email: " MARIA@EXAMPLE.COM ",
    phone: "(11) 99999-8888",
  });
  assert.deepEqual(customer, {
    name: "Maria Silva",
    email: "maria@example.com",
    phone: "11999998888",
  });
  assert.equal(validCustomer(customer), true);
  assert.equal(validCustomer({ ...customer, email: "inválido" }), false);
});

test("limita quantidades e converte o preço para centavos", () => {
  assert.equal(safeQuantity(0), 1);
  assert.equal(safeQuantity(3.9), 3);
  assert.equal(safeQuantity(500), 99);
  assert.equal(priceInCents(129.9), 12990);
  assert.equal(discountedPriceInCents(129.9, 10), 11691);
  assert.equal(discountedPriceInCents(100, 150), 100);
});

test("converte descrição formatada em texto simples para o checkout", () => {
  assert.equal(
    plainProductDescription("## Detalhes\n**Leve** e _resistente_\n- Cor azul"),
    "Detalhes\nLeve e resistente\nCor azul",
  );
});
