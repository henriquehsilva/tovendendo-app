import test from "node:test";
import assert from "node:assert/strict";
import { INSTALLMENT_OPTIONS, installmentMessage, productInstallments } from "../src/productInstallments.js";

test("limita o parcelamento entre zero e vinte e quatro vezes", () => {
  assert.equal(productInstallments(6), 6);
  assert.equal(productInstallments(30), 24);
  assert.equal(productInstallments(-2), 0);
  assert.deepEqual(INSTALLMENT_OPTIONS.slice(-2), [18, 24]);
});

test("monta uma mensagem apenas para produtos parceláveis", () => {
  assert.equal(installmentMessage(1), "");
  assert.match(installmentMessage(5), /até 5x/);
  assert.match(installmentMessage(5), /entrega ou retirada/);
});
