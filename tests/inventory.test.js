import test from "node:test";
import assert from "node:assert/strict";
import { finiteStock, requestedProducts } from "../netlify/functions/_inventory.js";

test("normaliza estoque e mantém produtos antigos como ilimitados", () => {
  assert.equal(finiteStock(undefined), null);
  assert.equal(finiteStock(""), null);
  assert.equal(finiteStock(7.9), 7);
  assert.equal(finiteStock(-2), 0);
});

test("soma itens repetidos para impedir que ultrapassem o estoque", () => {
  assert.deepEqual(
    requestedProducts([
      { id: "produto-1", quantity: 2 },
      { id: "produto-1", quantity: 3 },
    ]),
    [{ id: "produto-1", quantity: 5 }],
  );
});
