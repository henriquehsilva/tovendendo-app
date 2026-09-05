import { firebaseAdmin, json } from "./_firebase.js";

const publicFields = [
  "slug",
  "brand",
  "tagline",
  "description",
  "heroImage",
  "logoUrl",
  "address",
  "city",
  "state",
  "categories",
  "published",
];

export default async () => {
  try {
    const admin = firebaseAdmin();
    const snapshot = await admin.firestore().collection("stores").where("published", "==", true).get();
    const stores = snapshot.docs.map((document) => {
      const source = document.data();
      return publicFields.reduce((store, field) => {
        if (source[field] !== undefined) store[field] = source[field];
        return store;
      }, { id: document.id });
    });
    return json(200, { stores }, { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" });
  } catch (error) {
    console.error("Falha ao carregar o marketplace:", error);
    return json(500, { error: "Não foi possível carregar as lojas." });
  }
};
