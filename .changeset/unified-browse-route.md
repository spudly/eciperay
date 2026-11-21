---
'@eciperay/web': minor
'@eciperay/server': minor
'@eciperay/client': patch
---

Unified browse route (#622, tranche 2a, reworked 2026-11-21): /discover and
/recipes are the same auth-aware browse page, served at both URLs with no
redirect. A signed-in viewer sees the personalized unified browse (own recipes
with preferred placement plus the embedded public discovery feed) rendered in
place at /discover; a signed-out viewer sees the public browse at the same URL.
The server server-renders /discover with the public browse content and its SEO
head (canonical /discover), and the client takes over at the same URL, applying
signed-in personalization once auth resolves. The client package gains
recipeListDisplay / resizedImageUrl subpath exports so the server SSR view-model
shares the web host's formatting helpers.
