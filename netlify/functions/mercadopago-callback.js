import crypto from 'node:crypto';
import { firebaseAdmin } from './_firebase.js';

const signature = value => crypto.createHmac('sha256', process.env.MERCADO_PAGO_OAUTH_STATE_SECRET).update(value).digest('hex');
const redirect = (url, ok, message) => ({ statusCode:302, headers:{ Location:`${url}/admin?mp=${ok?'connected':'error'}&message=${encodeURIComponent(message)}` }, body:'' });

export const handler = async event => {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  try {
    const [payload, received] = String(event.queryStringParameters?.state || '').split('.');
    const expected = signature(payload);
    if (!received || received.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(received),Buffer.from(expected))) throw new Error('Autorização inválida.');
    const state = JSON.parse(Buffer.from(payload,'base64url').toString());
    if (Date.now()>state.exp) throw new Error('Autorização expirada. Tente novamente.');
    const code = event.queryStringParameters?.code;
    const redirectUri = `${appUrl}/.netlify/functions/mercadopago-callback`;
    const response = await fetch('https://api.mercadopago.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:process.env.MERCADO_PAGO_CLIENT_ID,client_secret:process.env.MERCADO_PAGO_CLIENT_SECRET,grant_type:'authorization_code',code,redirect_uri:redirectUri})});
    const credentials = await response.json();
    if (!response.ok) throw new Error(credentials.message || 'Mercado Pago recusou a conexão.');
    const admin = firebaseAdmin();
    await admin.firestore().doc(`mercadoPagoConnections/${state.storeId}`).set({ownerId:state.uid,accessToken:credentials.access_token,refreshToken:credentials.refresh_token,userId:String(credentials.user_id),publicKey:credentials.public_key||'',expiresAt:Date.now()+Number(credentials.expires_in||0)*1000,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
    await admin.firestore().doc(`stores/${state.storeId}`).set({payment:{connected:true,merchantUserId:String(credentials.user_id),enabled:true},updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
    return redirect(appUrl,true,'Conta Mercado Pago conectada.');
  } catch(error){return redirect(appUrl,false,error.message)}
};
