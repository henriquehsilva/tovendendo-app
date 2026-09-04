import test from "node:test";
import assert from "node:assert/strict";
import { categoryIconType, categorySuggestions } from "../src/categoryCatalog.js";

test("filtra sugestões ignorando acentos e categorias já usadas", () => {
  const suggestions = categorySuggestions("cosmeticos", ["Beleza"]);
  assert.equal(suggestions[0].name, "Cosméticos");
  assert.equal(categorySuggestions("beleza", ["Beleza"]).some((item) => item.name === "Beleza"), false);
});

test("associa categorias a famílias visuais", () => {
  assert.equal(categoryIconType("Acessórios para celular"), "tech");
  assert.equal(categoryIconType("Produtos para pets"), "pet");
  assert.equal(categoryIconType("Eletrônicos"), "tech");
  assert.equal(categoryIconType("Bicicletas"), "sport");
});
