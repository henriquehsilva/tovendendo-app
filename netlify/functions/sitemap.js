import { firebaseAdmin } from "./_firebase.js";
import { escapeHtml } from "./_seo.js";

const isoDate = (value) => {
  const date = value?.toDate?.() || (value ? new Date(value) : new Date());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

export default async function (request) {
  try {
    const origin = process.env.APP_URL || new URL(request.url).origin;
    const storesSnap = await firebaseAdmin().firestore().collection("stores")
      .where("published", "==", true).get();
    const dynamicUrls = await Promise.all(storesSnap.docs.map(async (storeDoc) => {
      const store = storeDoc.data();
      if (!store.slug) return [];
      const products = await storeDoc.ref.collection("products").get();
      const modified = isoDate(store.updatedAt);
      return [
        { loc: `${origin}/loja/${encodeURIComponent(store.slug)}`, lastmod: modified, priority: "0.8" },
        ...products.docs.map((product) => ({ loc: `${origin}/loja/${encodeURIComponent(store.slug)}/produto/${encodeURIComponent(product.id)}`, lastmod: isoDate(product.data().updatedAt || store.updatedAt), priority: "0.7" })),
      ];
    }));
    const urls = [
      { loc: `${origin}/`, priority: "1.0" },
      { loc: `${origin}/lojas`, priority: "0.9" },
      { loc: `${origin}/doc`, priority: "0.7" },
      ...dynamicUrls.flat(),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(({ loc, lastmod, priority }) => `  <url><loc>${escapeHtml(loc)}</loc>${lastmod ? `<lastmod>${escapeHtml(lastmod)}</lastmod>` : ""}<changefreq>weekly</changefreq><priority>${priority}</priority></url>`).join("\n")}\n</urlset>`;
    return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=3600" } });
  } catch (error) {
    console.error("Sitemap error:", error);
    return new Response("Não foi possível gerar o sitemap.", { status: 500 });
  }
}
