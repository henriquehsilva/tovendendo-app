import { MercadoPagoConfig, Preference } from 'mercadopago';
import { firebaseAdmin, json } from './_firebase.js';

export const handler = async event => {
  if (event.httpMethod !== 'POST') return json(405,{error:'Método não permitido.'});
  try {
    const { storeId, storeSlug, items } = JSON.parse(event.body || '{}');
    if (!storeId || !Array.isArray(items) || !items.length) return json(400,{error:'Sacola inválida.'});
    const admin=firebaseAdmin(), firestore=admin.firestore();
    const [storeSnap, connectionSnap] = await Promise.all([firestore.doc(`stores/${storeId}`).get(),firestore.doc(`mercadoPagoConnections/${storeId}`).get()]);
    if (!storeSnap.exists || !storeSnap.data().published) return json(404,{error:'Loja não encontrada.'});
    if (!connectionSnap.exists) return json(409,{error:'Esta loja ainda não conectou o Mercado Pago.'});
    const products=[];
    for(const requested of items){const snap=await firestore.doc(`stores/${storeId}/products/${requested.id}`).get();const p=snap.data(), quantity=Math.max(1,Math.floor(Number(requested.quantity)));if(!snap.exists||p.active===false||p.stock<quantity)throw new Error(`Estoque insuficiente para ${p?.name||'um produto'}.`);products.push({id:snap.id,title:p.name,quantity,unit_price:Number(p.price),currency_id:'BRL'});}
    const origin=process.env.APP_URL||event.headers.origin;
    const externalReference=firestore.collection(`stores/${storeId}/orders`).doc().id;
    await firestore.doc(`stores/${storeId}/orders/${externalReference}`).set({items:products.map(x=>({productId:x.id,name:x.title,quantity:x.quantity,unitPrice:x.unit_price})),status:'pending',createdAt:admin.firestore.FieldValue.serverTimestamp()});
    const client=new MercadoPagoConfig({accessToken:connectionSnap.data().accessToken});
    const preference=await new Preference(client).create({body:{items:products,external_reference:`${storeId}:${externalReference}`,statement_descriptor:storeSnap.data().payment?.statementDescriptor||undefined,payment_methods:{installments:Number(storeSnap.data().payment?.maxInstallments)||12},back_urls:{success:`${origin}/loja/${storeSlug}?payment=success`,pending:`${origin}/loja/${storeSlug}?payment=pending`,failure:`${origin}/loja/${storeSlug}?payment=failure`},auto_return:'approved',notification_url:`${origin}/.netlify/functions/mercadopago-webhook?storeId=${encodeURIComponent(storeId)}`}});
    return json(200,{checkoutUrl:preference.init_point});
  } catch(error){return json(400,{error:error.message||'Não foi possível iniciar o pagamento.'})}
};
