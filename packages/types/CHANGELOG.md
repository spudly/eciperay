# @eciperay/types

## 1.34.3

### Patch Changes

- b645447: Meal and meal-plan entries now split servings into servings to cook
  and servings to eat (#363): meal recipe members and direct meal ingredients,
  and meal-plan recipe entries, each carry `servingsToCook` and `servingsToEat`
  (eat defaults to cook). Meal and plan nutrition is computed from what is
  eaten, while the plan shopping list scales by what is cooked; meal and plan
  detail surfaces show both numbers per entry, and the plan detail gains the
  weekly totals / daily averages band over the eaten totals. The MCP meal and
  meal-plan tools accept and return both fields. Note: the design-system meal
  and meal-plan forms (9.2.x) expose a single servings stepper, which edits
  servings to cook — servings to eat follows it while the two are equal and is
  otherwise preserved — so setting a distinct servings-to-eat in the web/native
  forms awaits a design-system companion.
- 1ba5a4a: Daily nutrition goals are now min/max ranges instead of single
  targets (#521): each of calories, protein, carbs, fat, and satiety carries an
  optional `Min` and `Max` (either may be left blank), saving rejects a min
  above its max, and meal-plan goal progress bands the per-day average (or plan
  total) against the range — below the min is "Below goal", above the max is
  "Above goal", inside (or on the unset side) is "On track" — with rows reading
  `actual / range · band` (e.g. `1,940 / 1,800–2,200 · On track`,
  `128 / at least 110 · On track`, `2,300 / up to 2,200 · Above goal`). Existing
  single goals migrate without changing anyone's bands: macro goals become
  90%–110% of the old value and a satiety goal becomes a min at the old value.
  Account export carries the new range shape.
- 721d643: QA polish rollup from the 1.34.2 finalization sweep (#498, items 1,
  2, 3, 5; item 4 is tracked in the design system):

  - Meal counts: meal and meal-plan payloads now carry a recipe-only
    `recipeCount` alongside `memberCount` (which still counts direct ingredients
    too), and the web meal-plan detail and meals hub subtitles use it — a meal
    of 1 recipe + 1 direct ingredient now reads "1 recipe" instead of "2
    recipes".
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
    Discover page, the web Recipes page, and the app's Recipes list, leaving
    just the discovery meta line.

  Test: unit tests per fix — server meal-detail/plan-detail counts (recipe-only
  vs total members), ingredient-parser and Claude-parse tests including the
  exact "3 carrots, chopped" case for both import paths, schema.org WPRM
  card-matching normalization, server DTO and client permalink tests rendering a
  suffixed slug verbatim, and web/app list tests asserting the byline is omitted
  (and "Anonymous" never appears) for a nameless author.

- 9a42977: Complete Google Recipe structured data (#411): public recipe JSON-LD
  now includes totalTime, author, datePublished, recipeCategory/recipeCuisine
  and keywords from the displayed tags, and per-serving nutrition; Discover
  emits an ItemList of its listed public recipes. Recipe authors control the
  name shown on their published recipes from their profile (name + show/hide),
  backed by a new `show_author_on_public_recipes` user setting that gates the
  author name on public recipe payloads.

## 1.34.2

### Patch Changes

- 8f1506d: Meals now show and edit their direct ingredients on the web (#362
  tranche 2): the meal detail page renders direct ingredients in their own
  Ingredients section (quantity, servings, and nutrition scaled to the entry's
  total contribution; rows are plain rows, never links), the meal form gains an
  ingredients section for adding, editing, and removing direct ingredients
  (name, quantity, unit, entry servings — validated by the host at save time),
  and a meal plan's shopping list now includes the meal's direct ingredients at
  their entered quantity scaled by how many times the plan includes the meal.
  Shopping-list sources for direct ingredients carry a null recipe id/title,
  since the ingredient belongs to the meal itself. Native and MCP parity remain
  tranche 3.

## 1.34.1

No changes in this release.

## 1.34.0

### Patch Changes

- 1bf5611: Condensed nutrition now shows all five values — protein, carbs, fat,
  calories, and satiety score — wherever a summary nutrition line appears:
  recipe list and shared-with-me cards, the Recipes page rows, public discovery
  cards, meal and meal-plan totals, meal-plan entry lines, and the per-recipe
  member line on a meal's detail page. Previously the condensed lines showed
  only calories, protein, and satiety (recipe cards showed satiety alone), so
  carbs and fat required opening the full nutrition detail. Each value appears
  only when it is known for that recipe; a recipe whose nutrition is still
  pending keeps the existing pending/placeholder satiety wording.

  Meal and meal-plan totals are also corrected: recipe macros are stored per
  serving, but the aggregation scaled them by servings ÷ recipe servings, so a
  meal using a recipe's full serving count showed one serving's macros as the
  total. Totals (and the satiety scores derived from them) now multiply the
  per-serving macros by the servings used; the whole-recipe prepared weight
  keeps its fraction scaling. Meal totals, plan totals, per-day averages, and
  nutrition-goal progress figures all reflect the corrected totals.

- f19b8b6: Meal and meal-plan writes are now protected against silent
  overwrites: the meal and meal-plan detail responses expose their `updatedAt`
  value as an `ETag`, and `PUT /meals/:id` / `PUT /meal-plans/:id` accept that
  value back — as an `If-Match` header or as an `expectedUpdatedAt` field in the
  request body. When the stored record has changed since the client's read, the
  PUT fails with `409` (`Meal has been modified since it was loaded` /
  `Meal plan has been modified since it was loaded`) and writes nothing, so the
  caller can re-read, re-merge, and retry. Clients that send no token keep the
  previous unconditional full-replace behavior.
- ed4ff5e: Fix a recipe's status reverting to Idea after saving a draft version.
  Creating a draft from a Perfected recipe reopens it to Evolving and the
  version editor shows Evolving in its Status dropdown, but saving the draft
  silently reset the recipe's status to Idea: the version-save payload's status
  was stripped by the server's version-input validation, and the save then
  applied the create-path default. The version input now carries the editor's
  chosen status through to the save, and a version save that omits a status
  leaves the recipe's current status unchanged instead of resetting it. On the
  recipe detail page, a draft saved from a Perfected recipe now keeps the
  Evolving status the editor showed.
