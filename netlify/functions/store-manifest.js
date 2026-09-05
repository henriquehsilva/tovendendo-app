import { firebaseAdmin } from "./_firebase.js";

const cleanSlug = (value) => String(value || "").slice(0, 120).replace(/[^a-zA-Z0-9-]/g, "");
const themeColors = {
  sky: "#247da9",
  rose: "#b73f68",
  terracotta: "#a84f32",
  violet: "#6d4bcc",
  graphite: "#465b66",
};

export default async function (request) {
  try {
    const url = new URL(request.url);
    const slug = cleanSlug(url.searchParams.get("slug"));
    const stores = await firebaseAdmin().firestore().collection("stores")
      .where("slug", "==", slug).where("published", "==", true).limit(1).get();
    const storeSnap = stores.docs[0];
    if (!storeSnap) return new Response("Loja não encontrada.", { status: 404 });
    const store = storeSnap.data();
    const baseUrl = process.env.APP_URL || url.origin;
    const icon = (size) => `${baseUrl}/.netlify/functions/store-icon?storeId=${encodeURIComponent(storeSnap.id)}&size=${size}`;
    return new Response(JSON.stringify({
      id: `/loja/${store.slug}`,
      name: store.brand,
      short_name: String(store.brand).slice(0, 20),
      description: store.tagline || store.description || `Loja ${store.brand}`,
      start_url: `/loja/${store.slug}`,
      scope: "/",
      display: "standalone",
      display_override: ["standalone", "minimal-ui"],
      orientation: "portrait-primary",
      background_color: "#ffffff",
      theme_color: themeColors[store.palette] || themeColors.sky,
      lang: "pt-BR",
      categories: ["shopping", "business"],
      prefer_related_applications: false,
      icons: [
        { src: icon(192), sizes: "192x192", type: "image/png", purpose: "any" },
        { src: icon(512), sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
    }), { headers: { "content-type": "application/manifest+json; charset=utf-8", "cache-control": "public, max-age=300, stale-while-revalidate=3600", "access-control-allow-origin": "*" } });
  } catch (error) {
    console.error("Store manifest error:", error);
    return new Response("Não foi possível gerar o manifesto.", { status: 500 });
  }
}
