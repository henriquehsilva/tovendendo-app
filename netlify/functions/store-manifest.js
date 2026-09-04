import { firebaseAdmin } from "./_firebase.js";

const cleanSlug = (value) => String(value || "").slice(0, 120).replace(/[^a-zA-Z0-9-]/g, "");

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
      scope: `/loja/${store.slug}`,
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#247da9",
      lang: "pt-BR",
      icons: [
        { src: icon(192), sizes: "192x192", type: "image/png", purpose: "any" },
        { src: icon(512), sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
    }), { headers: { "content-type": "application/manifest+json; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=3600" } });
  } catch (error) {
    console.error("Store manifest error:", error);
    return new Response("Não foi possível gerar o manifesto.", { status: 500 });
  }
}
