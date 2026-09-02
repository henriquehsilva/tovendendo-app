# Tô Vendendo

Gerador de lojas virtuais para produtos variados. Cada lojista personaliza a vitrine, controla o estoque e configura sua própria chave Pix para receber pagamentos diretamente.

## Desenvolvimento

```bash
cp .env.example .env
npm install
npm run dev
```

Sem Firebase, o frontend abre em modo demonstração e salva dados no navegador.

## Firebase

Ative Authentication (e-mail/senha e, opcionalmente, Google), Firestore e Storage. Preencha as variáveis `VITE_FIREBASE_*`, codifique o JSON de uma conta de serviço em base64 e configure-o como `FIREBASE_SERVICE_ACCOUNT_BASE64` somente na Netlify. Publique `firestore.rules` e `storage.rules`.

## Pagamento por Pix

Cada lojista informa sua chave Pix, o nome e a cidade do recebedor no painel. A vitrine gera no navegador um QR Code Pix com o valor da compra e oferece o código copia e cola. O pagamento vai diretamente para a chave configurada; a plataforma não recebe nem intermedeia o valor.

## Deploy

O `netlify.toml` compila com `npm run build`, publica `dist` e habilita as funções em `netlify/functions`.

## Plano Pro e Stripe

O Stripe cobra somente a assinatura do software; os pagamentos das lojas são feitos diretamente por Pix. Crie um preço recorrente no Stripe e configure `STRIPE_SECRET_KEY` e `STRIPE_PRO_PRICE_ID` na Netlify. A variável aceita diretamente o preço `price_...` ou um produto `prod_...` que tenha esse preço recorrente definido como padrão. O formulário envia dados cadastrais à função `create-subscription`, que redireciona para o Stripe Checkout; os dados do cartão nunca passam pelo React.

## Stripe Connect para lojas

Cada lojista pode ativar uma conta Stripe Express no painel. Produtos e preços continuam cadastrados somente no Tô Vendendo e são enviados dinamicamente ao Checkout, sem duplicação no catálogo da Stripe. Cartões e carteiras elegíveis, como Google Pay, aparecem no checkout hospedado. Configure um webhook de contas conectadas em `/.netlify/functions/stripe-connect-webhook` para o evento `checkout.session.completed` e salve o segredo em `STRIPE_CONNECT_WEBHOOK_SECRET`.
