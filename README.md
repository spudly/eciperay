# Recipoo

A recipe management app for iOS and Android. Store, scale, and improve recipes
with AI assistance.

## Tech Stack

| Layer         | Technology                                                              |
| ------------- | ----------------------------------------------------------------------- |
| Mobile app    | React Native (bare), NativeWind v4, React Navigation v7, TanStack Query |
| Backend       | Node.js, Express v5, TypeScript                                         |
| Database      | Supabase Postgres (raw SQL via `pg`)                                    |
| Auth          | Supabase Auth                                                           |
| Image storage | Supabase Storage                                                        |
| AI            | Anthropic Claude (Haiku + Sonnet)                                       |

## Monorepo Structure

```
recipoo/
├── packages/
│   ├── app/        # React Native app (iOS + Android)
│   ├── server/     # Express API server
│   └── shared/     # Shared TypeScript types
├── scripts/
│   └── find-unused-eslint-rules.ts
├── eslint.config.ts
├── tsconfig.base.json
└── package.json    # npm workspaces root
```

## Prerequisites

- Node.js 22+
- npm 10+
- [React Native environment set up](https://reactnative.dev/docs/set-up-your-environment)
  (Xcode for iOS, Android Studio for Android)
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key

## Getting Started

### 1. Install dependencies

```sh
npm install
```

### 2. Configure environment variables

Create a free [Supabase](https://supabase.com) project, then:

```sh
cp .env.example packages/server/.env
```

Edit `packages/server/.env` and fill in your credentials:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres
ANTHROPIC_API_KEY=your-anthropic-key
PORT=8080
NODE_ENV=development
```

### 3. Run database migrations

This creates all tables and seeds the preset recipe tags:

```sh
npm run migrate --workspace=packages/server
```

### 4. Start the API server

```sh
npm run start --workspace=packages/server
```

The server runs at `http://localhost:8080`. Test it with:

```sh
curl http://localhost:8080/health
```

### 5. Start the mobile app

In a separate terminal, start the Metro bundler:

```sh
npm run start --workspace=packages/app
```

Then in another terminal, run on your chosen platform:

```sh
# iOS (requires Xcode + CocoaPods)
npm run ios --workspace=packages/app

# Android (requires Android Studio + emulator or device)
npm run android --workspace=packages/app
```

#### iOS — first time setup

Install CocoaPods (only needed once per machine):

```sh
bundle install
```

Then install pod dependencies (required after first clone and after any native
dep changes):

```sh
cd packages/app/ios && bundle exec pod install
```

## Development Scripts

Run from the **repo root** unless noted:

| Command                     | Description                                       |
| --------------------------- | ------------------------------------------------- |
| `npm run dev`               | Start API server + Metro bundler                  |
| `npm run dev:ios`           | Server + Metro + iOS simulator                    |
| `npm run dev:android`       | Server + Metro + Android emulator                 |
| `npm run dev:all`           | Server + Metro + iOS + Android simultaneously     |
| `npm run typecheck`         | TypeScript check on server + types packages       |
| `npm run lint`              | ESLint across all packages                        |
| `npm run lint:fix`          | ESLint with auto-fix                              |
| `npm run lint:unused-rules` | Report any ESLint rules not explicitly configured |
| `npm run prettier`          | Format all files                                  |
| `npm run prettier:check`    | Check formatting without writing                  |
| `npm test`                  | Run Jest (server + types), with coverage          |
| `npm run test:watch`        | Jest in watch mode                                |

## ESLint

The project uses ESLint v9 flat config (`eslint.config.ts`). Every rule from
every plugin is **explicitly configured** — no `plugin/recommended` preset
spreads. Run `npm run lint:unused-rules` after installing a new plugin to find
rules that need to be added to the config.

Plugins in use: `@typescript-eslint`, `eslint-plugin-react`,
`eslint-plugin-react-hooks`, `eslint-plugin-react-native`, `eslint-plugin-n`,
`eslint-plugin-import-x`, `eslint-plugin-jest`, `eslint-plugin-unicorn`,
`eslint-config-prettier`.

Pre-commit hooks (via Husky + lint-staged) run Prettier and ESLint on staged
files, then Jest on changed files.

## Design Principles

- **Small functions** — ideally fewer than 15 lines, single responsibility, max
  4 parameters (use an options object for more)
- **Small modules** — ideally fewer than 100 lines; each utility in its own file
- **No classes** — use plain functions and objects; native built-ins (`Map`,
  `Set`, `Error`, etc.) are fine
- **Functional style** — prefer pure functions and immutable data transforms

## Architecture Notes

- **Images** upload directly from the app to Supabase Storage; the server never
  handles binary image data
- **Recipe scaling** is client-side only and never persisted
- **AI draft/approval** — all AI-suggested recipe changes produce a `pending`
  draft; the user must explicitly approve or reject before the recipe is
  modified
- **AI conversation history** is stored per recipe per user in
  `ai_conversations`, giving Claude full context of past cooking notes and
  tweaks
