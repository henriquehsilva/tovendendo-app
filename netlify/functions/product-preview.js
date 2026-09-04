import { firebaseAdmin } from "./_firebase.js";
import { plainProductDescription } from "./_orders.js";
import { escapeHtml, productImages, productSchema, safeJsonLd } from "./_seo.js";

const cleanId = (value) =>
  String(value || "")
    .slice(0, 100)
    .replace(/[^a-zA-Z0-9_-]/g, "");

export default async function (request) {
  try {
    const url = new URL(request.url);
    const publicPath = url.pathname.match(
      /\/loja\/([^/]+)\/produto\/([^/?#]+)/,
    );
    const storeId = cleanId(url.searchParams.get("storeId"));
    const slug = String(url.searchParams.get("slug") || publicPath?.[1] || "")
      .slice(0, 120)
      .replace(/[^a-zA-Z0-9-]/g, "");
    const productId = cleanId(
      url.searchParams.get("productId") || publicPath?.[2],
    );
    const admin = firebaseAdmin();
    const firestore = admin.firestore();
    let storeRef;
    if (storeId) storeRef = firestore.doc(`stores/${storeId}`);
    else if (slug) {
      const stores = await firestore
        .collection("stores")
        .where("slug", "==", slug)
        .where("published", "==", true)
        .limit(1)
        .get();
      storeRef = stores.docs[0]?.ref;
    }
    if (!storeRef || !productId)
      return new Response("Produto não encontrado.", { status: 404 });
    const [storeSnap, productSnap] = await Promise.all([
      storeRef.get(),
      storeRef.collection("products").doc(productId).get(),
    ]);
    if (!storeSnap.exists || !storeSnap.data().published || !productSnap.exists)
      return new Response("Produto não encontrado.", { status: 404 });

    const store = storeSnap.data();
    const product = productSnap.data();
    const userAgent = request.headers.get("user-agent") || "";
    const isCrawler = /bot|crawler|spider|Google|Bing|facebookexternalhit|WhatsApp|Twitter|LinkedIn|Telegram|Slack|Discord/i.test(userAgent);
    const resolvedStoreId = storeRef.id;
    const imageVersion =
      url.searchParams.get("foto") ||
      url.searchParams.get("v") ||
      productId.slice(0, 8);
    const socialImage = `${process.env.APP_URL || url.origin}/.netlify/functions/product-share-image?${new URLSearchParams({ storeId: resolvedStoreId, productId, v: imageVersion })}`;
    const baseUrl = process.env.APP_URL || url.origin;
    const destination = `${baseUrl}/loja/${store.slug}#produto-${productId}`;
    const price = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(product.price) || 0);
    const title = `${product.name} · ${price}`;
    const description =
      plainProductDescription(product.description) ||
      `Confira este item da ${store.brand}.`;
    const publicUrl = `${baseUrl}/loja/${store.slug}/produto/${productId}`;
    if (!isCrawler) return Response.redirect(destination, 302);
    const schema = productSchema({ baseUrl, store, product, productId });
    const breadcrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Lojas", item: `${baseUrl}/lojas` },
      { "@type": "ListItem", position: 2, name: store.brand, item: `${baseUrl}/loja/${store.slug}` },
      { "@type": "ListItem", position: 3, name: product.name, item: publicUrl },
    ] };
    const image = productImages(product, baseUrl)[0] || socialImage;
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><meta property="og:type" content="product"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:image" content="${escapeHtml(socialImage)}"><meta property="og:image:secure_url" content="${escapeHtml(socialImage)}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:site_name" content="${escapeHtml(store.brand)}"><meta property="og:url" content="${escapeHtml(publicUrl)}"><meta property="product:price:amount" content="${escapeHtml(schema.offers.price)}"><meta property="product:price:currency" content="BRL"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(socialImage)}"><link rel="canonical" href="${escapeHtml(publicUrl)}"><script type="application/ld+json">${safeJsonLd(schema)}</script><script type="application/ld+json">${safeJsonLd(breadcrumb)}</script></head><body><nav><a href="/lojas">Lojas</a> › <a href="${escapeHtml(`${baseUrl}/loja/${store.slug}`)}">${escapeHtml(store.brand)}</a></nav><main><article><h1>${escapeHtml(product.name)}</h1><img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}"><p>${escapeHtml(description)}</p><strong>${escapeHtml(price)}</strong><p>${schema.offers.availability.endsWith("InStock") ? "Disponível" : "Indisponível"}</p><a href="${escapeHtml(destination)}">Comprar na ${escapeHtml(store.brand)}</a></article></main></body></html>`;
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
