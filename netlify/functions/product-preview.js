import { firebaseAdmin } from "./_firebase.js";

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const cleanId = (value) =>
  String(value || "")
    .slice(0, 100)
    .replace(/[^a-zA-Z0-9_-]/g, "");

export default async function (request) {
  try {
    const url = new URL(request.url);
    const storeId = cleanId(url.searchParams.get("storeId"));
    const productId = cleanId(url.searchParams.get("productId"));
    const admin = firebaseAdmin();
    const firestore = admin.firestore();
    const storeRef = firestore.doc(`stores/${storeId}`);
    const [storeSnap, productSnap] = await Promise.all([
      storeRef.get(),
      storeRef.collection("products").doc(productId).get(),
    ]);
    if (!storeSnap.exists || !storeSnap.data().published || !productSnap.exists)
      return new Response("Produto não encontrado.", { status: 404 });

    const store = storeSnap.data();
    const product = productSnap.data();
    const image = product.imageUrls?.[0] || product.imageUrl || store.logoUrl;
    const destination = `${process.env.APP_URL || url.origin}/loja/${store.slug}#produto-${productId}`;
    const price = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(product.price) || 0);
    const title = `${product.name} · ${price}`;
    const description =
      product.description || `Confira este item da ${store.brand}.`;
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta property="og:type" content="product"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:image" content="${escapeHtml(image)}"><meta property="og:image:secure_url" content="${escapeHtml(image)}"><meta property="og:site_name" content="${escapeHtml(store.brand)}"><meta property="og:url" content="${escapeHtml(url.href)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(image)}"><link rel="canonical" href="${escapeHtml(destination)}"></head><body><p>Abrindo <a href="${escapeHtml(destination)}">${escapeHtml(product.name)}</a>…</p><script>window.location.replace(${JSON.stringify(destination)})</script></body></html>`;
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("Product preview error:", error);
    return new Response("Não foi possível abrir o produto.", { status: 500 });
  }
}
