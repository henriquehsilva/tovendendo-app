# Repository Guidelines

## Project Structure & Module Organization

The Vite/React frontend lives in `src/`; `App.jsx` contains the routes and main views, while `data.js` supplies demo content. Netlify server functions live in `netlify/functions/`, including Stripe Connect, checkout, social-preview, and webhook handlers. Firebase security configuration is defined by `firestore.rules` and `storage.rules`. Production assets are generated in `dist/` and must not be edited directly.

## Build, Test, and Development Commands

Use the npm version recorded by `package-lock.json` and run:

- `npm run dev` — start the local development server.
- `npm run build` — create a production build.

Commit the lockfile associated with the selected package manager.

## Coding Style & Naming Conventions

Follow the formatter and linter configured by the project; run both before submitting changes. Until configuration exists, use two-space indentation for JSON, YAML, JavaScript, and TypeScript. Use `PascalCase` for components and classes, `camelCase` for functions and variables, and `kebab-case` for directories and non-component filenames. Keep modules focused and avoid committing generated build output.

## Testing Guidelines

Add tests with every behavior change and regression fix. Mirror the source layout beneath `tests/`, or colocate tests if required by the selected framework. Name tests `*.test.*` or `*.spec.*` consistently. Once a test runner is introduced, document its command and any coverage threshold here; prioritize meaningful coverage of business rules and user-facing flows.

## Commit & Pull Request Guidelines

There is no Git history from which to infer an existing convention. Use concise, imperative subjects, preferably Conventional Commits (for example, `feat: add availability warning`). Keep commits narrowly scoped. Pull requests should explain the change, verification performed, and configuration or migration impact. Link relevant issues and include screenshots for UI changes. Never commit `.env`, Stripe secrets, or Firebase service-account JSON; update `.env.example` with placeholders instead.
