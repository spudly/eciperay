# Eciperay

A recipe management app for iOS, Android, and web. Store, scale, import, and
improve recipes with AI assistance.

## Tech Stack

| Layer         | Technology                                                        |
| ------------- | ----------------------------------------------------------------- |
| Mobile app    | React Native, NativeWind v5, Tailwind CSS v4, React Navigation v7 |
| Web app       | Vite 6, React 19, React Router 7, Tailwind CSS v4, Vitest, MSW    |
| Shared client | `@eciperay/client` — API, auth, query keys, recipe utils          |
| Shared theme  | `@eciperay/theme` — Tailwind v4 design tokens                     |
| Backend       | Node.js, Express v5, TypeScript                                   |
| Database      | Supabase Postgres (raw SQL via `pg`)                              |
| File storage  | Supabase Storage (`recipe-images` bucket for recipe photos)       |
| Auth          | Supabase Auth                                                     |
| AI            | Anthropic Claude (Haiku + Sonnet)                                 |

## Monorepo Structure

```
eciperay/
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
vars; the mobile app uses `API_BASE_URL` and `SUPABASE_*` via the Metro env shim
(`.env` for development, `.env.production` for release APKs).

Add `http://localhost:8081/**` to your Supabase project's redirect URLs for web
auth (password reset).

### 3. Run database migrations

```sh
npm run migrate --workspace=packages/server
```

This also creates the public `recipe-images` Supabase Storage bucket and RLS
policies (migration `003_recipe_images_storage.sql`). Recipe photos upload
directly from the browser to `{supabase-user-id}/{recipe-id}`; only the public
URL is stored in `recipes.image_url`.

### 4. Start development

```sh
# API + Metro (mobile)
npm run dev

# API + Vite (web) — http://localhost:8081
npm run dev:web

# API + Metro + iOS simulator
npm run dev:ios

# API + Metro + physical Android phone (USB)
npm run dev:android
```

### Production (API + web from one server)

```sh
npm run build
npm run start
```

The server serves the API under `/api/*` and the compiled Vite app for all other
routes. Set `VITE_API_BASE_URL=/api` when building the web app (default in
`.env.example`). Mobile release builds use `.env.production` with
`API_BASE_URL=https://eciperay.com/api`.

### Deploy to Fly.io

One Fly app serves **API + static web** from the root `Dockerfile`.

**1. Install the CLI and log in**

```sh
brew install flyctl   # or https://fly.io/docs/flyctl/install/
fly auth login
```

**2. Create the app (once)**

```sh
fly apps create eciperay   # or edit `app` in fly.toml
```

**3. Set secrets** (runtime — not baked into the web bundle)

```sh
fly secrets set \
  DATABASE_URL='postgresql://...' \
  SUPABASE_URL='https://your-project.supabase.co' \
  SUPABASE_SECRET_KEY='your-service-role-key' \
  ANTHROPIC_API_KEY='your-anthropic-key' \
  OPENAI_API_KEY='your-openai-key' \
  CORS_ORIGINS='https://eciperay.com,https://www.eciperay.com'
```

`CORS_ORIGINS` is mainly for non-browser clients; same-origin web does not need
it.

**4. Deploy**

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your local `.env` are
passed as Docker build args (public anon key — expected in the client bundle):

```sh
./scripts/fly-deploy.sh
```

Or manually:

```sh
fly deploy \
  --build-arg VITE_API_BASE_URL=/api \
  --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-anon-key
```

**GitHub Actions** (`.github/workflows/fly-deploy.yml`) deploys automatically
after CI passes on `master`. You can also trigger a deploy manually from the
Actions tab (**Deploy** → **Run workflow**).

Add these repository secrets (Settings → Secrets and variables → Actions):

| Secret                   | Purpose                                       |
| ------------------------ | --------------------------------------------- |
| `FLY_API_TOKEN`          | Fly deploy token (`fly tokens create deploy`) |
| `VITE_SUPABASE_URL`      | Docker build arg for the web bundle           |
| `VITE_SUPABASE_ANON_KEY` | Docker build arg for the web bundle           |

Runtime secrets (`DATABASE_URL`, `SUPABASE_SECRET_KEY`, API keys, etc.) stay on
Fly via `fly secrets set` — they are not needed in GitHub.

Optional: create a **production** environment in GitHub to require approval
before deploys.

**5. Custom domain**

```sh
fly certs add eciperay.com
fly certs add www.eciperay.com
```

Point DNS at the addresses `fly certs add` prints (usually `A` + `AAAA` to Fly).

**6. Post-deploy**

- Supabase → Authentication → URL configuration: add `https://eciperay.com/**`
- Android release builds: use `.env.production` (see below) — not the dev `.env`

Migrations run automatically on each deploy via `release_command` in `fly.toml`.
The default machine config uses **512MB RAM** and **auto-stop** when idle to
keep cost down (`min_machines_running = 0`). First request after idle may take a
few seconds to cold-start.

```sh
fly logs
fly status
curl https://eciperay.com/api/health
```

### Android physical device

1. Enable **Developer options** and **USB debugging** on your phone
2. Connect via USB and accept the debugging prompt
3. Verify: `adb devices` (should show your phone serial, not `emulator-XXXX`)
4. Run `npm run dev:android`

The setup script forwards ports over USB so the phone can reach Metro (`8081`)
and the API (`8080`). Keep `API_BASE_URL=http://localhost:8080/api` in `.env`.

If multiple phones are connected, set `ANDROID_SERIAL` to the device id from
`adb devices`.

### Android release builds

Release APKs bundle production API and Supabase config at **build time** via the
Metro `@env` shim. Debug/Metro builds keep using `.env` (localhost).

**1. Create production env** at the repo root:

```sh
cp .env.production.example .env.production
# Edit: API_BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY
```

Typical production values:

```sh
API_BASE_URL=https://eciperay.com/api
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

**2. Build release APK**

```sh
npm run android:release
# or: ./scripts/android-release.sh
```

The script sets `APP_ENV=production`, validates env vars, writes `env-shim.js`,
and runs `./gradlew assembleRelease`. Output:
`packages/app/android/app/build/outputs/apk/release/app-release.apk`.

**3. Install on a device** (USB debugging on):

```sh
adb install -r packages/app/android/app/build/outputs/apk/release/app-release.apk
```

Verify the app hits `https://eciperay.com/api` (not localhost) — e.g. sign in
against production Supabase.

CI verifies production shim generation on every PR (no full APK build).

### Deploy Android via GitHub Actions

The **Android Deploy** workflow (`.github/workflows/android-deploy.yml`) builds
a signed release APK after CI passes on `master`, or on manual dispatch from the
Actions tab. It uses **GitHub secrets** (not `.env.production` on the runner).

Add these repository secrets (Settings → Secrets and variables → Actions):

| Secret                      | Purpose                                           |
| --------------------------- | ------------------------------------------------- |
| `VITE_SUPABASE_URL`         | Production Supabase URL (same as web deploy)      |
| `VITE_SUPABASE_ANON_KEY`    | Production Supabase anon key (same as web deploy) |
| `ANDROID_KEYSTORE_BASE64`   | Base64-encoded release `.jks` / `.keystore` file  |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password                                 |
| `ANDROID_KEY_ALIAS`         | Key alias                                         |
| `ANDROID_KEY_PASSWORD`      | Key password                                      |

`API_BASE_URL` is set to `https://eciperay.com/api` in the workflow. Env
precedence in CI: exported secrets override any file on disk.

Generate a keystore locally (once):

```sh
keytool -genkeypair -v -storetype PKCS12 \
  -keystore upload-keystore.jks -alias eciperay \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -i upload-keystore.jks | pbcopy   # paste into ANDROID_KEYSTORE_BASE64
```

Download the APK from the workflow run’s **Artifacts** tab
(`eciperay-android-<run-number>`). Install with:

```sh
adb install -r app-release.apk
```

Optional: create a **production** environment in GitHub to require approval
before Android deploys (same as Fly web deploy).

## Development Scripts

| Command                   | Description                               |
| ------------------------- | ----------------------------------------- |
| `npm run build`           | Build web app into `packages/web/dist`    |
| `npm run start`           | Production server (API + static web)      |
| `./scripts/fly-deploy.sh` | Deploy API + web to Fly.io                |
| `npm run dev`             | API server + Metro bundler                |
| `npm run dev:web`         | API server + Vite web app                 |
| `npm run dev:ios`         | Server + Metro + iOS simulator            |
| `npm run dev:android`     | Server + Metro + physical Android device  |
| `npm run android:release` | Production-env Android release APK        |
| `npm run android:device`  | Build/install app on connected phone only |
| `npm run typecheck`       | TypeScript check all packages             |
| `npm run lint`            | ESLint across all packages                |
| `npm run ci`              | Full CI (typecheck, lint, audit, tests)   |
| `npm test`                | Run all package tests                     |
| `npm run test:coverage`   | All packages with 100% coverage threshold |

## Testing

All code packages (`client`, `web`, `app`, `server`) enforce **100%** test
coverage. Run `npm run ci` before opening a PR.

### Test runners

| Package           | Runner | Why                                                                   |
| ----------------- | ------ | --------------------------------------------------------------------- |
| `packages/server` | Jest   | Node/Express integration tests with supertest and nock                |
| `packages/client` | Jest   | Shared TypeScript library; same ESM Jest setup as server              |
| `packages/app`    | Jest   | React Native preset and native-module mocks                           |
| `packages/web`    | Vitest | Shares Vite's transform pipeline, aliases, and ESM config (see below) |

**Why Vitest for web, not Jest?** `packages/web` is a Vite 6 ESM app. Vitest
runs on the same config as dev and build (`vitest.config.ts` reuses Vite
plugins, path aliases, and `envDir`), so tests resolve modules the same way the
app does. Jest would need a parallel transform/alias setup (e.g. `vite-jest` or
custom `moduleNameMapper`) on top of the Jest 29/30 configs already used by app,
server, and client. Vitest also fits the web stack (`vi` mocks, `jsdom`, MSW,
`@vitest/coverage-v8`) without extra bridging. We keep Jest where it is the
natural fit (Node API, React Native); we use Vitest only for the Vite web
package.

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
