# SSR Phase 0 — inventory (issue #304)

Verified against master `32f09e26` on 2026-11-12. This is the Phase 0
inventory from the approved #304 plan; the spike follows in the same
Phase 0 tranche. No user-visible change.

## How the server serves the web bundle today

- `packages/server/src/staticWeb.ts` (`attachWebStatic`): `express.static`
  over `packages/web/dist` with `index: false` and `fallthrough: true`,
  then a catch-all that `sendFile`s the single SPA `index.html` for every
  non-API GET/HEAD request.
- Consequence: every public URL returns the same empty shell with HTTP
  200 — including URLs that match no route (soft-404). An SSR layer must
  replace this catch-all for public paths, render per-route HTML, and
  return a real 404 for unknown public recipes/pages.

## Route table — public vs signed-in

Public routes (`packages/web/src/routes/router.tsx`, outside `AuthGuard`):

- `/` (HomeEntry), `/discover`, `/recipe/:id/:slug` (PublicRecipePage)
- `/login`, `/signup`, `/forgot-password`, `/reset-password`
- `/pay`, `/privacy`, `/privacy/consent`, `/terms`

Everything else sits behind `AuthGuard`/`AuthenticatedShell`
(`/recipes`, `/meals`, `/meal-plans`, `/shared-with-me`, `/add`, `/tags`,
`/profile`, …) and has no SEO value — it stays a plain SPA per the plan.

Per Stephen's approval on #304, **all** public routes above get SSR, not
just the landing/Discover/recipe starter set.

## Head/meta today

- Per-page head is client-only: `packages/web/src/components/PageHead.tsx`
  mutates `document.head` in a `useEffect` from a `PageHeadConfig`
  (`@eciperay/client`) — title, description, canonical, Open Graph. None
  of it exists in the served HTML.
- Per-page meta/Open Graph artifacts themselves are a follow-up issue
  (Stephen's #304 amendment); SSR must render whatever head config a
  page declares into the initial HTML.

## robots.txt / sitemap.xml

- Already served by the server: `packages/server/src/routes/seo/`
  (`attachSeoRoutes`, wired in `server.ts`) with
  `packages/server/src/lib/buildRobotsTxt.ts` and
  `packages/server/src/lib/buildSitemapXml.ts`. These were the
  Phase 1 artifacts split out of #304 — they exist and are out of scope
  here beyond confirming the routes keep working under SSR.

## Spike (next step in this tranche)

- Server-render ONE public page (`/recipe/:id/:slug`, PublicRecipePage)
  with `react-dom/server` inside the Express process, reusing the DS page
  components and the server's own data access (no internal HTTP hop).
- Measure payload, TTFB, and hydration cost; decide from the result
  whether SSR stays a rendering layer inside `server` importing the web
  page tree, or whether `server` + `web` merge into one package.
  Plan lean: do not merge up front.
