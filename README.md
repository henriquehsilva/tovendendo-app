# Tô Vendendo

Gerador de lojas virtuais para produtos variados. Cada lojista personaliza a vitrine, controla o estoque e conecta sua própria conta Mercado Pago para receber pagamentos com cartão, Pix e parcelamento.

## Desenvolvimento

```bash
cp .env.example .env
npm install
npm run dev
```

Sem Firebase, o frontend abre em modo demonstração e salva dados no navegador. O checkout real e a conexão Mercado Pago exigem Firebase Admin e as variáveis de servidor.

## Firebase

Ative Authentication (e-mail/senha e, opcionalmente, Google), Firestore e Storage. Preencha as variáveis `VITE_FIREBASE_*`, codifique o JSON de uma conta de serviço em base64 e configure-o como `FIREBASE_SERVICE_ACCOUNT_BASE64` somente na Netlify. Publique `firestore.rules` e `storage.rules`.

## Mercado Pago por lojista

Crie uma aplicação de marketplace no Mercado Pago, configure a URL de redirecionamento como:

```text
https://seu-dominio.com/.netlify/functions/mercadopago-callback
```

Na Netlify, defina `MERCADO_PAGO_CLIENT_ID`, `MERCADO_PAGO_CLIENT_SECRET`, `MERCADO_PAGO_OAUTH_STATE_SECRET` e `APP_URL`. O lojista salva sua loja e usa **Conectar Mercado Pago** no painel. O OAuth grava o token individual em `mercadoPagoConnections/{storeId}`, coleção bloqueada para clientes pelas regras do Firestore.

O checkout sempre relê preço e estoque no servidor. Após a confirmação do webhook, o pedido é aprovado e as unidades vendidas são baixadas do estoque em uma transação.

## Deploy

O `netlify.toml` compila com `npm run build`, publica `dist` e habilita as funções em `netlify/functions`.

## Plano Pro e Stripe

O Stripe cobra somente a assinatura do software; as vendas dos lojistas continuam no Mercado Pago conectado por OAuth. Crie um preço recorrente no Stripe e configure `STRIPE_SECRET_KEY` e `STRIPE_PRO_PRICE_ID` na Netlify. O formulário envia dados cadastrais à função `create-subscription`, que redireciona para o Stripe Checkout; os dados do cartão nunca passam pelo React.
