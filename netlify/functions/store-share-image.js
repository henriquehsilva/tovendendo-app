import sharp from "sharp";
import { firebaseAdmin } from "./_firebase.js";

const cleanId = (value) => String(value || "").slice(0, 100).replace(/[^a-zA-Z0-9_-]/g, "");
const xml = (value) => String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const shorten = (value, size) => String(value || "").replace(/\s+/g, " ").trim().slice(0, size);

export default async function (request) {
  try {
    const storeId = cleanId(new URL(request.url).searchParams.get("storeId"));
    if (!storeId) return new Response("Imagem não encontrada.", { status: 404 });
    const storeSnap = await firebaseAdmin().firestore().doc(`stores/${storeId}`).get();
    if (!storeSnap.exists || !storeSnap.data().published) return new Response("Imagem não encontrada.", { status: 404 });
    const store = storeSnap.data();
    const categories = (store.categories || []).map((item) => item.name).filter(Boolean).slice(0, 3).join("  •  ");
    const source = store.heroImage;
    let background = sharp({ create: { width: 1200, height: 630, channels: 3, background: "#dff3fb" } });
    if (source) {
      const sourceUrl = new URL(source);
      if (["firebasestorage.googleapis.com", "images.unsplash.com"].includes(sourceUrl.hostname)) {
        const imageResponse = await fetch(sourceUrl);
        if (imageResponse.ok) background = sharp(Buffer.from(await imageResponse.arrayBuffer())).resize(1200, 630, { fit: "cover", position: "centre" });
      }
    }
    const brand = xml(shorten(store.brand, 42));
    const tagline = xml(shorten(store.tagline || store.description || "Descubra produtos especiais.", 88));
    const location = xml(shorten(store.address || "Loja online", 48));
    const categoryLine = xml(shorten(categories, 70));
    const overlay = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0d2635" stop-opacity=".96"/><stop offset=".58" stop-color="#102d3d" stop-opacity=".78"/><stop offset="1" stop-color="#102d3d" stop-opacity=".18"/></linearGradient></defs><rect width="1200" height="630" fill="url(#shade)"/><rect x="72" y="64" width="190" height="42" rx="21" fill="#fff" fill-opacity=".16"/><circle cx="94" cy="85" r="7" fill="#55b8e8"/><text x="112" y="92" fill="#fff" font-family="Arial,sans-serif" font-size="20" font-weight="700">TÔ VENDENDO</text><text x="72" y="296" fill="#fff" font-family="Arial,sans-serif" font-size="68" font-weight="700">${brand}</text><text x="72" y="354" fill="#e4f3f9" font-family="Arial,sans-serif" font-size="27">${tagline}</text>${categoryLine ? `<text x="72" y="434" fill="#fff" font-family="Arial,sans-serif" font-size="22" font-weight="700">${categoryLine}</text>` : ""}<rect x="72" y="492" width="350" height="60" rx="12" fill="#fff"/><text x="98" y="530" fill="#18394b" font-family="Arial,sans-serif" font-size="22" font-weight="700">Conheça a loja  →</text><text x="1160" y="574" text-anchor="end" fill="#fff" font-family="Arial,sans-serif" font-size="20">⌖ ${location}</text></svg>`);
    const output = await background.composite([{ input: overlay }]).jpeg({ quality: 82, progressive: true }).toBuffer();
    return new Response(output, { headers: { "content-type": "image/jpeg", "content-length": String(output.length), "cache-control": "public, max-age=86400, s-maxage=604800" } });
  } catch (error) {
    console.error("Store share image error:", error);
    return new Response("Não foi possível gerar a imagem.", { status: 500 });
  }
}
