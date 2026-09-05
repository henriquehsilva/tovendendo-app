import { firebaseAdmin } from "./_firebase.js";
import { absoluteUrl, escapeHtml, plainText, productSchema, safeJsonLd } from "./_seo.js";

const cleanSlug = (value) => String(value || "").slice(0, 120).replace(/[^a-zA-Z0-9-]/g, "");
const isSocialCrawler = (agent) => /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|Googlebot/i.test(agent || "");

export default async function (request) {
  try {
    const url = new URL(request.url);
    const slug = cleanSlug(url.searchParams.get("slug") || url.pathname.match(/\/loja\/([^/?#]+)/)?.[1]);
    if (!slug) return new Response("Loja não encontrada.", { status: 404 });

    if (!isSocialCrawler(request.headers.get("user-agent"))) {
      const appResponse = await fetch(new URL("/index.html", url.origin));
      return new Response(await appResponse.arrayBuffer(), {
        status: appResponse.status,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" },
      });
    }

    const firestore = firebaseAdmin().firestore();
    const stores = await firestore.collection("stores")
      .where("slug", "==", slug).where("published", "==", true).limit(1).get();
    const storeSnap = stores.docs[0];
    if (!storeSnap) return new Response("Loja não encontrada.", { status: 404 });
    const store = storeSnap.data();
    const productsSnap = await firestore.collection("stores").doc(storeSnap.id).collection("products").get();
    const products = productsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const baseUrl = process.env.APP_URL || url.origin;
    const publicUrl = `${baseUrl}/loja/${store.slug}`;
    const version = store.updatedAt?.toMillis?.() || storeSnap.id;
    const socialImage = `${baseUrl}/.netlify/functions/store-share-image?${new URLSearchParams({ storeId: storeSnap.id, v: String(version) })}`;
    const title = `${store.brand} | Loja online`;
    const categories = (store.categories || []).map((item) => item.name).filter(Boolean).slice(0, 3).join(" · ");
    const description = plainText(store.tagline || store.description || `Conheça a loja ${store.brand} e descubra seus produtos.`);
    const imageAlt = `${store.brand}${categories ? ` — ${categories}` : ""}`;
    const sameAs = [store.instagram ? `https://instagram.com/${String(store.instagram).replace(/^@/, "")}` : ""].filter(Boolean);
    const storeSchema = {
      "@context": "https://schema.org", "@type": "Store", "@id": `${publicUrl}#store`,
      name: store.brand, description, url: publicUrl, image: absoluteUrl(baseUrl, store.heroImage || socialImage),
      logo: absoluteUrl(baseUrl, store.logoUrl || "/default-store-logo.png"),
      telephone: store.whatsapp ? `+${String(store.whatsapp).replace(/\D/g, "")}` : undefined,
      address: { "@type": "PostalAddress", streetAddress: store.address || undefined, addressLocality: store.city || undefined, addressRegion: store.state || undefined, addressCountry: "BR" },
      sameAs,
      hasOfferCatalog: { "@type": "OfferCatalog", name: `Produtos de ${store.brand}`, itemListElement: products.map((product, index) => ({ "@type": "ListItem", position: index + 1, item: productSchema({ baseUrl, store, product, productId: product.id }) })) },
    };
    const productLinks = products.map((product) => `<article><h2><a href="${escapeHtml(`${publicUrl}/produto/${product.id}`)}">${escapeHtml(product.name)}</a></h2><p>${escapeHtml(plainText(product.description, 240))}</p><strong>R$ ${escapeHtml(Number(product.price || 0).toFixed(2).replace(".", ","))}</strong></article>`).join("");
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><meta property="og:type" content="website"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="Tô Vendendo"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(publicUrl)}"><meta property="og:image" content="${escapeHtml(socialImage)}"><meta property="og:image:secure_url" content="${escapeHtml(socialImage)}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${escapeHtml(imageAlt)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(socialImage)}"><link rel="canonical" href="${escapeHtml(publicUrl)}"><link rel="alternate" hreflang="pt-BR" href="${escapeHtml(publicUrl)}"><script type="application/ld+json">${safeJsonLd(storeSchema)}</script></head><body><header><a href="/">Tô Vendendo</a></header><main><h1>${escapeHtml(store.brand)}</h1><p>${escapeHtml(description)}</p><p>${escapeHtml(store.address || "Loja online")}</p><section aria-label="Produtos">${productLinks || "<p>Catálogo em atualização.</p>"}</section></main><footer><a href="${escapeHtml(publicUrl)}">Visitar ${escapeHtml(store.brand)}</a></footer></body></html>`;
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=3600" } });
  } catch (error) {
    console.error("Store preview error:", error);
    return new Response("Não foi possível abrir a loja.", { status: 500 });
  }
}
