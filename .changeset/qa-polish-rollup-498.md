---
'@eciperay/types': patch
'@eciperay/client': patch
'@eciperay/server': patch
'@eciperay/web': patch
'@eciperay/app': patch
---

QA polish rollup from the 1.34.2 finalization sweep (#498, items 1, 2, 3, 5;
item 4 is tracked in the design system):

- Meal counts: meal and meal-plan payloads now carry a recipe-only `recipeCount`
  alongside `memberCount` (which still counts direct ingredients too), and the
  web meal-plan detail and meals hub subtitles use it — a meal of 1 recipe + 1
  direct ingredient now reads "1 recipe" instead of "2 recipes".
- Text and URL imports no longer drop the preparation word: for "3 carrots,
  chopped" the qualifier lands in the ingredient's notes. The Claude import
  prompt now instructs qualifier → notes, and a deterministic post-parse step
  shared with the schema.org parser splits a trailing comma-separated
  preparation qualifier (chopped, diced, minced, divided, to taste, …) into
  notes whenever notes is empty.
- Permalinks: the recipe detail response returns the stored slug verbatim
  (pinned by regression tests on the server DTO and the client permalink
  builder), so a stored slug carrying a numeric suffix displays exactly as
  stored in the Sharing section.
- Discover bylines: public recipes whose author has no display name no longer
  show a "By Anonymous" byline — the byline is omitted entirely on the web
  Discover page, the web Recipes page, and the app's Recipes list, leaving just
  the discovery meta line.

Test: unit tests per fix — server meal-detail/plan-detail counts (recipe-only vs
total members), ingredient-parser and Claude-parse tests including the exact "3
carrots, chopped" case for both import paths, schema.org WPRM card-matching
normalization, server DTO and client permalink tests rendering a suffixed slug
verbatim, and web/app list tests asserting the byline is omitted (and
"Anonymous" never appears) for a nameless author.
