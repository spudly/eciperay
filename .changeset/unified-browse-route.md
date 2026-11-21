---
'@eciperay/web': minor
---

Unified browse route (#622, tranche 2a): /discover and /recipes now resolve to
the same browse page. A signed-in viewer arriving at /discover is redirected to
the unified Recipes browse (own recipes with preferred placement plus the
embedded public discovery feed); a signed-out viewer keeps the public-only
Discover treatment at /discover.
