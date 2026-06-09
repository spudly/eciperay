# Recipoo

A recipe management app for iOS, Android, and web. Store, scale, import, and
improve recipes with AI assistance.

## Tech Stack

| Layer         | Technology                                                        |
| ------------- | ----------------------------------------------------------------- |
| Mobile app    | React Native, NativeWind v5, Tailwind CSS v4, React Navigation v7 |
| Web app       | Vite 6, React 19, React Router 7, Tailwind CSS v4, Vitest, MSW    |
| Shared client | `@recipoo/client` — API, auth, query keys, recipe utils           |
| Shared theme  | `@recipoo/theme` — Tailwind v4 design tokens                      |
| Backend       | Node.js, Express v5, TypeScript                                   |
| Database      | Supabase Postgres (raw SQL via `pg`)                              |
| Auth          | Supabase Auth                                                     |
| AI            | Anthropic Claude (Haiku + Sonnet)                                 |

## Monorepo Structure

```
recipoo/
├── packages/
│   ├── app/        # React Native app (iOS + Android)
│   ├── web/        # Vite web app
│   ├── client/     # Shared API client, auth, utils
│   ├── theme/      # Shared Tailwind v4 tokens
│   ├── server/     # Express API server
│   └── types/      # Shared TypeScript types
├── scripts/
│   └── findUnusedEslintRules.ts
├── eslint.config.ts
├── tsconfig.base.json
└── package.json
```

## Prerequisites

- Node.js 22+
- npm 10+
- [React Native environment](https://reactnative.dev/docs/set-up-your-environment)
  (for mobile)
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key

## Getting Started

### 1. Install dependencies

```sh
npm install
```

### 2. Configure environment variables

Copy the example env to the repo root (used by server, Metro, and Vite):

```sh
cp .env.example .env
```

Fill in Supabase, Anthropic, and URL values. Web requires `VITE_*` prefixed
vars; the mobile app uses `API_BASE_URL` and `SUPABASE_*` via the Metro env
shim.

Add `http://localhost:8081/**` to your Supabase project's redirect URLs for web
auth (password reset).

### 3. Run database migrations

```sh
npm run migrate --workspace=packages/server
```

### 4. Start development

```sh
# API + Metro (mobile)
npm run dev

# API + Vite (web) — http://localhost:8081
npm run dev:web

# API + Metro + iOS simulator
npm run dev:ios
```

## Development Scripts

| Command                 | Description                               |
| ----------------------- | ----------------------------------------- |
| `npm run dev`           | API server + Metro bundler                |
| `npm run dev:web`       | API server + Vite web app                 |
| `npm run dev:ios`       | Server + Metro + iOS simulator            |
| `npm run dev:android`   | Server + Metro + Android emulator         |
| `npm run typecheck`     | TypeScript check all packages             |
| `npm run lint`          | ESLint across all packages                |
| `npm run ci`            | Full CI (typecheck, lint, audit, tests)   |
| `npm test`              | Run all package tests                     |
| `npm run test:coverage` | All packages with 100% coverage threshold |

## Testing

All code packages (`client`, `web`, `app`, `server`) enforce **100%** test
coverage. Run `npm run ci` before opening a PR.

### PR smoke checklist

- [ ] `npm run ci` passes
- [ ] `npm run dev:web` — sign in, list recipes, import, edit, delete
- [ ] iOS/Android — auth persistence, add flow, recipe detail tabs

## Architecture Notes

- **Import flows** save a draft recipe server-side, then open ImportReview for
  edit or discard (delete)
- **AI drafts** from chat/cleanup require explicit approve/reject
- **Recipe scaling** is client-side only and never persisted
- **Tags** are managed per user; preset tags are read-only
