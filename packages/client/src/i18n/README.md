# Shared i18n catalogs

The Lingui `.po` catalogs are split three ways (#681):

- **Core (this folder)** — `locales/{en-US,en-XA}/messages.po` in
  `@eciperay/client`: the strings both hosts (web and app) render
  identically. Defined once here; each host imports the core catalog through
  the `@eciperay/client/i18n/locales/<locale>/messages.po` package export and
  merges it with its own catalog at runtime (`{...core, ...host}` in each
  host's `src/i18n/i18n.ts`, host wins on collision).
- **Host catalogs** — `packages/web/src/i18n/locales/…` and
  `packages/app/src/i18n/locales/…`: only that host's own strings.

One exception: a msgid whose text genuinely differs per host (per-platform
copy for the same string id) is a **host variant** — it stays in both host
catalogs and never moves to core.

The client package ships `.po` data only (no Lingui dependency); each host's
existing pipeline compiles it (Vite plugin on web, Metro transformer on app).

After running `i18n:extract` in either host, `scripts/i18n-dedupe-catalogs.mjs`
(wired into both hosts' `i18n:extract` scripts, and runnable from the root as
`npm run i18n:dedupe`) moves any msgid that extraction recreated identically
in both host catalogs into core and removes host copies of core msgids. The
root script test `scripts/i18nCatalogs.test.cjs` asserts the split stays
exact: every catalog parses and no msgid is defined in more than one place.
