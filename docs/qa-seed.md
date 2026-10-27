# QA dataset seed pass

The QA sweeps and manual test runs (see `docs/manual-tests.md`) exercise the app
as a dedicated **QA account** in the Supabase QA dataset — the dataset the five
`PREVIEW_*` repository secrets point at, shared by the persistent preview
environment (`eciperay-next`) and the per-PR review apps (issue #234). This
document is the seed pass for that account: the starter content that makes the
account's library non-empty, so list, detail, search, servings, and cook-log
cases have something real to run against.

## Prerequisites (account steps, done once by a person)

1. Create the QA account by signing up on the preview environment
   (`https://eciperay-next.fly.dev`) with the QA email alias. The account must
   live in the QA dataset — never create it on production.
2. Grant the account the comp override (Power) in the QA dataset's
   `entitlement_overrides`, so plan-gated and AI features are testable.
3. Save the account credentials in the Secure Vault (the QA sweeps sign in with
   the saved login).

Until the account exists, the seed cannot run — the script needs the account's
credentials. Nothing else blocks it: the mechanism below is in place and
idempotent.

## Running the seed

```sh
QA_BASE_URL=https://eciperay-next.fly.dev \
QA_SUPABASE_URL=<the PREVIEW_SUPABASE_URL value> \
QA_SUPABASE_ANON_KEY=<the PREVIEW_VITE_SUPABASE_ANON_KEY value> \
QA_EMAIL=<QA account email> \
QA_PASSWORD=<QA account password> \
npm run seed:qa
```

The script (`scripts/seedQaDataset.ts`):

- **Refuses production targets.** `QA_BASE_URL` must be a Fly preview app
  (`*.fly.dev`, with the production app `eciperay.fly.dev` refused by name) or
  localhost. The production site can never be seeded.
- Signs in through Supabase Auth with the QA account, lists the account's
  recipes, and creates only the missing seed recipes through the app's own API
  (`POST /api/recipes`), so the data is exactly app-shaped.
- **Idempotent.** Re-running skips recipes whose titles already exist; it never
  duplicates or overwrites account content.

## What it seeds

A small, fixed set (defined in `scripts/seedQaDataset.ts`), every title carrying
the QA protocol's `QA —` prefix:

| Recipe                        | Exists to support                       |
| ----------------------------- | --------------------------------------- |
| `QA — Weeknight Tomato Pasta` | Recipe list, detail, and servings cases |
| `QA — Scaling Test Pancakes`  | Servings scaling and cook-log cases     |
| `QA — Simple Garden Salad`    | Search and filtering cases              |

Seed content is the account's standing library — unlike sweep-created data, it
is **not** cleaned up at the end of a run. To remove it, delete the recipes from
the QA account in the app; the next seed run will recreate them.
