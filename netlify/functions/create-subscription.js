import Stripe from 'stripe';
import { json } from './_firebase.js';

export const handler = async event => {
  if(event.httpMethod!=='POST')return json(405,{error:'Método não permitido.'});
  try{
    const data=JSON.parse(event.body||'{}');
    const required=['name','email','phone','document','address','city','state','zip'];
    if(required.some(key=>!String(data[key]||'').trim()))return json(400,{error:'Preencha todos os campos obrigatórios.'});
    if(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_PRO_PRICE_ID)return json(503,{error:'Stripe ainda não foi configurado no servidor.'});
    const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
    const priceId=process.env.STRIPE_PRO_PRICE_ID;
    if(!priceId.startsWith('price_'))return json(500,{error:'STRIPE_PRO_PRICE_ID deve ser um preço recorrente price_.'});
    const origin=process.env.APP_URL||event.headers.origin||'http://localhost:5173';
    const customer=await stripe.customers.create({name:data.name,email:data.email,phone:data.phone,address:{line1:data.address,city:data.city,state:data.state,postal_code:data.zip,country:'BR'},metadata:{customer_type:data.customerType==='empresa'?'empresa':'pessoa_fisica',document:data.document,company_name:data.companyName||''}});
    const session=await stripe.checkout.sessions.create({mode:'subscription',customer:customer.id,line_items:[{price:priceId,quantity:1}],billing_address_collection:'required',customer_update:{address:'auto',name:'auto'},tax_id_collection:{enabled:data.customerType==='empresa'},allow_promotion_codes:true,success_url:`${origin}/admin?subscription=success`,cancel_url:`${origin}/?subscription=cancelled`});
    return json(200,{checkoutUrl:session.url});
  }catch(error){return json(500,{error:error.message||'Não foi possível iniciar a assinatura.'})}
};
