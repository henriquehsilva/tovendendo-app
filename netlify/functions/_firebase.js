import admin from "firebase-admin";

export function firebaseAdmin() {
  if (admin.apps.length) return admin;
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!encoded)
    throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 não configurado.");
  const credential = JSON.parse(
    Buffer.from(encoded, "base64").toString("utf8"),
  );
  admin.initializeApp({ credential: admin.credential.cert(credential) });
  return admin;
}

export const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
