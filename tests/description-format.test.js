import test from "node:test";
import assert from "node:assert/strict";
import {
  formatDescriptionSelection,
  prefixDescriptionLines,
  stripDescriptionFormatting,
} from "../src/descriptionFormat.js";

test("remove formatação da descrição para integrações de texto simples", () => {
  assert.equal(
    stripDescriptionFormatting(
      "## Destaque\n**Resistente** e _leve_.\n- Veja no [site](https://example.com)",
    ),
    "Destaque\nResistente e leve.\nVeja no site",
  );
});

test("aplica formatação à seleção mantendo o texto", () => {
  assert.deepEqual(formatDescriptionSelection("Muito leve", 6, 10, "**"), {
    value: "Muito **leve**",
    selectionStart: 8,
    selectionEnd: 12,
  });
});

test("transforma várias linhas em lista", () => {
  assert.equal(prefixDescriptionLines("Um\nDois", 0, 7, "- ").value, "- Um\n- Dois");
});
