import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, plainText, productSchema, safeJsonLd } from "../netlify/functions/_seo.js";

test("escapa HTML e remove formatação das descrições de SEO", () => {
  assert.equal(escapeHtml('<Loja "A">'), "&lt;Loja &quot;A&quot;&gt;");
  assert.equal(plainText("## Produto **leve**\ncom qualidade"), "Produto leve com qualidade");
});

test("gera oferta estruturada com preço final e disponibilidade", () => {
  const schema = productSchema({ baseUrl: "https://tovendendo.app", store: { slug: "minha-loja", brand: "Minha Loja" }, productId: "p1", product: { name: "Bolsa", price: 100, cashbackPercent: 10, stock: 2, imageUrl: "/foto.jpg" } });
  assert.equal(schema.offers.price, "90.00");
  assert.equal(schema.offers.availability, "https://schema.org/InStock");
  assert.match(safeJsonLd({ value: "</script>" }), /\\u003c/);
});
