import sharp from "sharp";
import { firebaseAdmin } from "./_firebase.js";

const cleanId = (value) => String(value || "").slice(0, 100).replace(/[^a-zA-Z0-9_-]/g, "");

export default async function (request) {
  try {
    const url = new URL(request.url);
    const storeId = cleanId(url.searchParams.get("storeId"));
    const size = url.searchParams.get("size") === "512" ? 512 : 192;
    const storeSnap = await firebaseAdmin().firestore().doc(`stores/${storeId}`).get();
    if (!storeSnap.exists || !storeSnap.data().published) return new Response("Ícone não encontrado.", { status: 404 });
    const logoUrl = storeSnap.data().logoUrl;
    let logo;
    if (logoUrl) {
      const parsed = new URL(logoUrl);
      if (parsed.hostname === "firebasestorage.googleapis.com") {
        const response = await fetch(parsed);
        if (response.ok) logo = Buffer.from(await response.arrayBuffer());
      }
    }
    const fallback = Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="${size * .2}" fill="#247da9"/><text x="50%" y="58%" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="${size * .42}" font-weight="700">${String(storeSnap.data().brand || "L").charAt(0).replace(/[<>&]/g, "")}</text></svg>`);
    const output = await sharp(logo || fallback).resize(size, size, { fit: "cover" }).png().toBuffer();
    return new Response(output, { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400, s-maxage=604800" } });
  } catch (error) {
    console.error("Store icon error:", error);
    return new Response("Não foi possível gerar o ícone.", { status: 500 });
  }
}
