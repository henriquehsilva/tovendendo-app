import { firebaseAdmin, json } from "./_firebase.js";

const clean = (value, limit) =>
  String(value || "")
    .trim()
    .slice(0, limit);
const cleanId = (value) => clean(value, 100).replace(/[^a-zA-Z0-9_-]/g, "");

export default async function (request) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64)
    return json(503, { error: "Interações ainda não foram configuradas." });
  try {
    const admin = firebaseAdmin();
    const firestore = admin.firestore();
    const url = new URL(request.url);
    const body = request.method === "POST" ? await request.json() : {};
    const storeId = cleanId(body.storeId || url.searchParams.get("storeId"));
    const productId = cleanId(
      body.productId || url.searchParams.get("productId"),
    );
    if (!storeId || !productId)
      return json(400, { error: "Produto inválido." });

    const storeRef = firestore.doc(`stores/${storeId}`);
    const productRef = storeRef.collection("products").doc(productId);
    const [storeSnap, productSnap] = await Promise.all([
      storeRef.get(),
      productRef.get(),
    ]);
    if (!storeSnap.exists || !storeSnap.data().published || !productSnap.exists)
      return json(404, { error: "Produto não encontrado." });

    const commentsRef = productRef.collection("comments");
    if (request.method === "GET") {
      const comments = await commentsRef
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();
      return json(200, {
        likesCount: Number(productSnap.data().likesCount) || 0,
        comments: comments.docs.map((document) => ({
          id: document.id,
          ...document.data(),
          createdAt:
            document.data().createdAt?.toDate?.().toISOString() || null,
        })),
      });
    }

    if (request.method !== "POST")
      return json(405, { error: "Método não permitido." });

    if (body.action === "like") {
      const visitorId = clean(body.visitorId, 100).replace(
        /[^a-zA-Z0-9-]/g,
        "",
      );
      if (visitorId.length < 10)
        return json(400, { error: "Identificação da curtida inválida." });
      const likeRef = productRef.collection("likes").doc(visitorId);
      const result = await firestore.runTransaction(async (transaction) => {
        const [likeSnap, currentProduct] = await Promise.all([
          transaction.get(likeRef),
          transaction.get(productRef),
        ]);
        const current = Number(currentProduct.data().likesCount) || 0;
        if (likeSnap.exists) return { liked: true, likesCount: current };
        transaction.create(likeRef, {
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        transaction.update(productRef, { likesCount: current + 1 });
        return { liked: true, likesCount: current + 1 };
      });
      return json(200, result);
    }

    if (body.action === "comment") {
      const author = clean(body.author, 40);
      const text = clean(body.text, 300);
      if (author.length < 2 || text.length < 1)
        return json(400, { error: "Informe seu nome e comentário." });
      const comment = {
        author,
        text,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      const saved = await commentsRef.add(comment);
      await productRef.set(
        { commentsCount: admin.firestore.FieldValue.increment(1) },
        { merge: true },
      );
      return json(201, {
        comment: {
          id: saved.id,
          author,
          text,
          createdAt: new Date().toISOString(),
        },
      });
    }

    return json(400, { error: "Ação inválida." });
  } catch (error) {
    console.error("Product social error:", error);
    return json(500, {
      error: error.message || "Não foi possível concluir esta interação.",
    });
  }
}
