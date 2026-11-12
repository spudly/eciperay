# SSR Phase 0 — inventory (issue #304)

Verified against master `32f09e26` on 2026-11-12. This is the Phase 0 inventory
from the approved #304 plan; the spike follows in the same Phase 0 tranche. No
user-visible change.

## How the server serves the web bundle today

- `packages/server/src/staticWeb.ts` (`attachWebStatic`): `express.static` over
  `packages/web/dist` with `index: false` and `fallthrough: true`, then a
  catch-all that `sendFile`s the single SPA `index.html` for every non-API
  GET/HEAD request.
- Consequence: every public URL returns the same empty shell with HTTP 200 —
  including URLs that match no route (soft-404). An SSR layer must replace this
  catch-all for public paths, render per-route HTML, and return a real 404 for
  unknown public recipes/pages.

## Route table — public vs signed-in

Public routes (`packages/web/src/routes/router.tsx`, outside `AuthGuard`):

- `/` (HomeEntry), `/discover`, `/recipe/:id/:slug` (PublicRecipePage)
- `/login`, `/signup`, `/forgot-password`, `/reset-password`
- `/pay`, `/privacy`, `/privacy/consent`, `/terms`

Everything else sits behind `AuthGuard`/`AuthenticatedShell` (`/recipes`,
`/meals`, `/meal-plans`, `/shared-with-me`, `/add`, `/tags`, `/profile`, …) and
has no SEO value — it stays a plain SPA per the plan.

Per Stephen's approval on #304, **all** public routes above get SSR, not just
the landing/Discover/recipe starter set.

## Head/meta today

- Per-page head is client-only: `packages/web/src/components/PageHead.tsx`
  mutates `document.head` in a `useEffect` from a `PageHeadConfig`
  (`@eciperay/client`) — title, description, canonical, Open Graph. None of it
  exists in the served HTML.
- Per-page meta/Open Graph artifacts themselves are a follow-up issue (Stephen's
  #304 amendment); SSR must render whatever head config a page declares into the
  initial HTML.

## robots.txt / sitemap.xml

- Already served by the server: `packages/server/src/routes/seo/`
  (`attachSeoRoutes`, wired in `server.ts`) with
  `packages/server/src/lib/buildRobotsTxt.ts` and
  `packages/server/src/lib/buildSitemapXml.ts`. These were the Phase 1 artifacts
  split out of #304 — they exist and are out of scope here beyond confirming the
  routes keep working under SSR.

## Spike (next step in this tranche)

First spike step landed: the public-recipe data load now lives in
`packages/server/src/lib/loadPublicRecipe.ts` (extracted from the
`getPublicRecipe` HTTP handler, which keeps identical status/body behavior), so
the SSR renderer can load view data through the server's own data access with no
internal HTTP hop.

- Server-render ONE public page (`/recipe/:id/:slug`, PublicRecipePage) with
  `react-dom/server` inside the Express process, reusing the DS page components
  and the server's own data access (no internal HTTP hop).
- Measure payload, TTFB, and hydration cost; decide from the result whether SSR
  stays a rendering layer inside `server` importing the web page tree, or
  whether `server` + `web` merge into one package. Plan lean: do not merge up
  front.

## Spike — render experiment (landed 2026-11-12)

`packages/server/src/lib/renderPublicRecipe.ts` renders the DS PublicRecipePage
with `react-dom/server` inside the server package, fed by
`buildPublicRecipePageProps.ts` (the loader response mapped to the DS page's
ready-state props, mirroring the web host's mapping for the anonymous first
paint). Findings:

- **It renders.** The full page HTML comes out of `renderToString` in-process:
  title, scaled ingredient lines, and instruction steps all present (asserted in
  renderPublicRecipe.test.ts).
- **Payload/time (fixture recipe, this dev VM, jest-transpiled pipeline —
  indicative only):** 46,647 bytes of HTML; ~186 ms cold / ~90 ms warm per
  render. Warm renders are not byte-identical across calls (Tamagui class/id
  counters), so the route-wiring tranche must verify hydration determinism
  before serving this HTML to the web bundle.
- **The DS graph needs the web substitutions + a transpiler.** @spudly/ui pages
  import `react-native`; plain Node cannot parse react-native's Flow entry, and
  react-native-svg's ESM assumes bundler resolution + transpilation (its fabric
  specs call `codegenNativeComponent`, which react-native-web lacks — the
  .web.js variants avoid them). The server jest config now carries the same
  substitutions as the web Vite build (react-native → react-native-web,
  web-first extensions, the svg sound-module stub, transform of the DS graph
  packages). Production route wiring owes the equivalent for the server's
  runtime entry (a bundled SSR entry is the natural route).
- **Decision: no package merge.** The renderer works as a layer inside `server`
  against the server's own data access, per the plan lean; nothing in the
  experiment required the web package's tree (the DS page is props-driven, and
  the host-side mapping ported cleanly). Merging `server` + `web` is not
  justified.
