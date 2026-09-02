import { MercadoPagoConfig, Payment } from 'mercadopago';
import { firebaseAdmin, json } from './_firebase.js';

export const handler = async event => {
  try {
    const body=JSON.parse(event.body||'{}');
    const paymentId=event.queryStringParameters?.['data.id']||event.queryStringParameters?.id||body?.data?.id;
    const storeId=event.queryStringParameters?.storeId;
    if(!paymentId)return json(200,{received:true});
    const admin=firebaseAdmin(), firestore=admin.firestore();
    if(!storeId)return json(400,{error:'Loja não informada.'});
    const connection=await firestore.doc(`mercadoPagoConnections/${storeId}`).get();
    if(!connection.exists)return json(404,{error:'Conexão não encontrada.'});
    const payment=await new Payment(new MercadoPagoConfig({accessToken:connection.data().accessToken})).get({id:paymentId});
    if(!payment?.external_reference)return json(200,{received:true});
    const [referenceStoreId,orderId]=payment.external_reference.split(':');
    if(referenceStoreId!==storeId)return json(403,{error:'Pagamento não pertence à loja.'});
    const orderRef=firestore.doc(`stores/${referenceStoreId}/orders/${orderId}`);
    await firestore.runTransaction(async tx=>{const order=await tx.get(orderRef);if(!order.exists||order.data().status==='approved')return;tx.update(orderRef,{status:payment.status,paymentId:String(payment.id),updatedAt:admin.firestore.FieldValue.serverTimestamp()});if(payment.status==='approved')for(const item of order.data().items)tx.update(firestore.doc(`stores/${referenceStoreId}/products/${item.productId}`),{stock:admin.firestore.FieldValue.increment(-item.quantity)});});
    return json(200,{received:true});
  }catch(error){console.error(error);return json(500,{error:'Falha ao processar notificação.'})}
};
