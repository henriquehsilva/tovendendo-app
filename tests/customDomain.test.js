import test from "node:test";
import assert from "node:assert/strict";
import { isValidDomain, normalizeDomain } from "../src/customDomain.js";

test("normaliza o domínio informado pelo lojista", () => {
  assert.equal(normalizeDomain(" HTTPS://MinhaLoja.COM.BR/ "), "minhaloja.com.br");
});

test("aceita domínios completos e rejeita URLs com caminhos", () => {
  assert.equal(isValidDomain("loja.exemplo.com.br"), true);
  assert.equal(isValidDomain("exemplo.com.br/minha-loja"), false);
  assert.equal(isValidDomain("localhost"), false);
});
