import sharp from "sharp";
import { firebaseAdmin } from "./_firebase.js";

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
      return new Response("Imagem não encontrada.", { status: 404 });

    const product = productSnap.data();
    const source =
      product.imageUrls?.[0] || product.imageUrl || storeSnap.data().logoUrl;
    if (!source) return new Response("Produto sem imagem.", { status: 404 });
    const sourceUrl = new URL(source);
    if (sourceUrl.hostname !== "firebasestorage.googleapis.com")
      return new Response("Origem da imagem não permitida.", { status: 400 });

    const imageResponse = await fetch(sourceUrl);
    if (!imageResponse.ok)
      throw new Error("Falha ao carregar imagem original.");
    const output = await sharp(Buffer.from(await imageResponse.arrayBuffer()))
      .resize(1200, 630, { fit: "cover", position: "centre" })
      .jpeg({ quality: 72, progressive: true })
      .toBuffer();
    return new Response(output, {
      headers: {
        "content-type": "image/jpeg",
        "content-length": String(output.length),
        "cache-control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch (error) {
    console.error("Product share image error:", error);
    return new Response("Não foi possível gerar a imagem.", { status: 500 });
  }
}
