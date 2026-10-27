# Live Playwright suite (issue #233)

The mocked suite in `../e2e` (fixtures + route interception, no real backend)
stays the fast PR gate. This suite runs the same web app against a **real
backend — the Supabase QA dataset** (the persistent `development` branch) — so
the authenticated core flows get functional coverage that fixtures cannot
provide: real auth, real API, real data round-trips.

It never touches production data:

- The in-job stack (`startStack.ts`) reads **only** the `PREVIEW_*` environment
  names and fails fast if any is missing. There is no code path that falls back
  to production values.
- The CI job is same-repo only, like the mocked e2e job, because fork PRs
  receive no secrets.

## Targets

| Mode                      | How                                                                | Backend                                                  |
| ------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| In-job stack (CI default) | `npm run test:e2e:live` with the `PREVIEW_*` env set               | The PR's own build + API server, wired to the QA dataset |
| External                  | `E2E_BASE_URL=https://eciperay-next.fly.dev npm run test:e2e:live` | The persistent preview app (merged master only)          |

## The account seam

The authenticated specs (`auth`, `recipes`, `cook-log`, `meal-plans`, `imports`,
`sharing`) need the dedicated CI test account:

- **Stephen creates the account on the QA dataset** (the preview app's sign-up,
  e.g. a `+ci` email alias), grants it the comp override (Power), and stores its
  credentials as the GitHub Actions secrets `E2E_QA_EMAIL` and
  `E2E_QA_PASSWORD`.
- Until then, `auth.setup.ts` writes an empty storageState and every
  authenticated spec **skips with the reason printed in `qa.ts`**. The
  signed-out/read-only specs (`public.spec.ts`) run unconditionally.
- On the first run after the secrets land, expect possible selector touch-ups:
  the authenticated specs were written against the app's own component tests and
  view sources, but they can only be exercised end-to-end once the account
  exists. Treat a first-run failure as suite calibration, not an app regression,
  until triaged.

## Hygiene

- Everything a test creates is named `CI — …` and deleted in teardown (API
  delete in `afterEach`; the recipe delete test itself uses the UI).
- The password-reset spec sends one real reset email to the CI account's inbox
  per run — that is the flow working as intended.
- URL and image imports are deliberately not covered: URL import depends on
  third-party page content, image import on AI generation; neither is a stable
  CI target. Text import is covered.
- The in-job server does not run migrations: the QA dataset's schema is kept at
  parity by the preview deploy flow (#234). A PR that adds migrations can
  therefore see schema-lag failures in this job until the change reaches the
  preview — that is expected, and is the same seam PR 4 of #234 closes for
  review apps.

## Coverage map (issue #233 scope)

| Flow                                                          | Spec                            |
| ------------------------------------------------------------- | ------------------------------- |
| Sign-in (setup) + profile + sign-out                          | `auth.setup.ts`, `auth.spec.ts` |
| Password-reset request                                        | `auth.spec.ts`                  |
| Recipes create / edit / delete, search                        | `recipes.spec.ts`               |
| Servings + scale controls                                     | `recipes.spec.ts`               |
| Cook log submit + skip                                        | `cook-log.spec.ts`              |
| Meal plan create + add recipe + shopping list check-off       | `meal-plans.spec.ts`            |
| Text import                                                   | `imports.spec.ts`               |
| Sharing visibility (public readable signed-out)               | `sharing.spec.ts`               |
| Signed-out redirects, bad-password rejection, Discover render | `public.spec.ts`                |
