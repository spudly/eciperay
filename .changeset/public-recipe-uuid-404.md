---
'@eciperay/server': patch
---

Public recipe loads now return a clean not-found for a non-UUID recipe id instead of surfacing a Postgres "invalid input syntax for type uuid" error: `loadPublicRecipe` validates the id before querying, so both `GET /api/public/recipes/:id/:slug` and the server-rendered `/recipe/:id/:slug` page answer 404 for malformed ids such as `/api/public/recipes/999999999/no-such-recipe`.
