export function storeManifestHref(slug, backendEnabled) {
  if (!backendEnabled || !slug) return "/manifest.webmanifest";
  return `/.netlify/functions/store-manifest?slug=${encodeURIComponent(slug)}`;
}

export function isInstalledApp(browserWindow = window) {
  return Boolean(
    browserWindow.matchMedia("(display-mode: standalone)").matches
      || browserWindow.navigator.standalone,
  );
}
