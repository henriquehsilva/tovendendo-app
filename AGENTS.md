# Repository Guidelines

## Project Structure & Module Organization

The Vite/React frontend lives in `src/`; `App.jsx` contains all components and routes in a single ~2980-line file, while `data.js` supplies demo content. Netlify server functions live in `netlify/functions/`, including Stripe Connect, checkout, social-preview, and webhook handlers. Firebase security configuration is defined by `firestore.rules` and `storage.rules`. Production assets are generated in `dist/` and must not be edited directly.

## Build, Test, and Development Commands

Use the npm version recorded by `package-lock.json` and run:

- `npm run dev` — start the local development server (Vite on port 5173).
- `npm run build` — create a production build.
- `npm test` — runs `node --test` (Node.js built-in test runner, not Jest or Vitest). Tests live under `tests/`.

Commit the lockfile associated with the selected package manager.

## Demo Mode

Without `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_PROJECT_ID`, the app runs entirely in demo mode using `localStorage`. No server functions or Firebase backend are needed. Copy `.env.example` to `.env` (can be left empty) and run `npm run dev`.

## Server Functions

Netlify functions in `netlify/functions/` use the raw Web API pattern (`export default async (request) => new Response(...)`) — not Express. They import shared helpers from `_firebase.js` (Firebase Admin init) and `_orders.js` (customer validation, price math). The `sharp` dependency is used server-side for image processing in `product-share-image.js`.

## Firebase Admin

The service account JSON is stored base64-encoded in `FIREBASE_SERVICE_ACCOUNT_BASE64` (Netlify env only, never in `.env.example` for local use). Local development uses the client SDK only.

## Payment Architecture

- **Pix**: Generated entirely client-side in the browser via the `qrcode` package. No server involvement.
- **Stripe Connect**: Per-store card payments through hosted Stripe Checkout. Webhook at `/.netlify/functions/stripe-connect-webhook` for `checkout.session.completed`.
- **Pro subscription**: Platform subscription (R$ 49.90/mo) via `create-subscription` function redirecting to Stripe Checkout.

## Coding Style & Naming Conventions

There is no ESLint or Prettier config file in the repo despite Prettier being a devDependency. Use two-space indentation for JavaScript/JSX. Use `PascalCase` for React components, `camelCase` for functions and variables. Keep modules focused and avoid committing generated build output.

## Testing Guidelines

Tests use Node.js built-in `node:test` and `node:assert/strict`. Add tests with every behavior change and regression fix. Mirror the source layout beneath `tests/`. Name tests `*.test.*` consistently. Prioritize meaningful coverage of business rules and user-facing flows (customer validation, price calculation, order logic).

## UI Language

All user-facing text, form labels, error messages, and most comments are in Brazilian Portuguese. Maintain this convention for any new UI text.

## Routes

- `/` — marketing landing page
- `/loja/:slug` — public storefront
- `/admin/login` — authentication (email/password + optional Google)
- `/admin` — store management dashboard (requires auth)
- Product social preview redirect: `/loja/:slug/produto/:productId` → server function

## Commit & Pull Request Guidelines

Use concise, imperative subjects, preferably Conventional Commits (for example, `feat: add availability warning`). Keep commits narrowly scoped. Pull requests should explain the change, verification performed, and configuration or migration impact. Link relevant issues and include screenshots for UI changes. Never commit `.env`, Stripe secrets, or Firebase service-account JSON; update `.env.example` with placeholders instead.
