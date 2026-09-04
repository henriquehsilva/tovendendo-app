import test from "node:test";
import assert from "node:assert/strict";
import {
  externalOfferError,
  isSafeOfferUrl,
  normalizeExternalOffers,
} from "../src/externalOffers.js";

test("aceita somente links externos HTTP ou HTTPS", () => {
  assert.equal(isSafeOfferUrl("https://marketplace.example/item"), true);
  assert.equal(isSafeOfferUrl("javascript:alert(1)"), false);
  assert.equal(isSafeOfferUrl("marketplace.example/item"), false);
});

test("normaliza ofertas externas completas", () => {
  assert.deepEqual(normalizeExternalOffers([
    { marketplace: " Loja A ", price: "99.90", url: " https://example.com/a " },
    { marketplace: "", price: 20, url: "https://example.com/b" },
  ]), [{ marketplace: "Loja A", price: 99.9, url: "https://example.com/a" }]);
});

test("rejeita oferta externa preenchida parcialmente", () => {
  assert.match(externalOfferError([{ marketplace: "Loja A", price: 50, url: "" }]), /link válido/);
});
