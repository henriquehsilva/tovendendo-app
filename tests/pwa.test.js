import test from "node:test";
import assert from "node:assert/strict";
import { isInstalledApp, storeManifestHref } from "../src/pwa.js";

test("uses the static manifest when the Netlify backend is unavailable", () => {
  assert.equal(storeManifestHref("minha-loja", false), "/manifest.webmanifest");
});

test("uses an encoded store manifest when the backend is available", () => {
  assert.equal(
    storeManifestHref("loja especial", true),
    "/.netlify/functions/store-manifest?slug=loja%20especial",
  );
});

test("detects browser standalone modes", () => {
  const browserWindow = {
    matchMedia: () => ({ matches: false }),
    navigator: { standalone: true },
  };
  assert.equal(isInstalledApp(browserWindow), true);
});
