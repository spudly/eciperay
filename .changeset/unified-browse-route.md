---
'@eciperay/web': minor
'@eciperay/server': minor
'@eciperay/client': patch
---

Unified browse route (#622, tranche 2a, reworked 2026-11-21): there is ONE
unified, auth-aware browse page and it lives at /recipes only — /discover is
removed entirely (no route, no redirect, no sitemap entry). A signed-in viewer
sees the personalized unified browse (own recipes with preferred placement plus
the embedded public discovery feed) at /recipes; a signed-out viewer sees the
public browse at the same URL. The server server-renders /recipes with the
public browse content and its SEO head (canonical /recipes), and the client
takes over at the same URL, applying signed-in personalization once auth
resolves. The client package gains recipeListDisplay / resizedImageUrl subpath
exports so the server SSR view-model shares the web host's formatting helpers.
