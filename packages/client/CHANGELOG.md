# @eciperay/client

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
- Updated dependencies [b645447]
- Updated dependencies [1ba5a4a]
- Updated dependencies [721d643]
- Updated dependencies [9a42977]
  - @eciperay/types@1.34.3

## 1.34.2

### Patch Changes

- 717a009: Auth forms now validate the email address before submitting (#461):
  on sign-in, sign-up, and forgot-password (web and native), a malformed email
  shows "Enter a valid email address" under the email field and no auth request
  is made, instead of surfacing the generic invalid-credentials error.
  Well-formed emails behave exactly as before. The forms render through
  @spudly/ui 9.1.0, whose auth pages accept the field-level `emailError` prop
  this validation uses.
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
- 99ef1b0: SEO foundations (#414): every page now draws its title, description,
  canonical URL, and Open Graph / Twitter values from one shared head config in
  @eciperay/client — full social cards for public pages (home, Discover, public
  recipes, privacy, terms), title + noindex only for authenticated pages, and no
  share image emitted when a page has none. The sitemap now includes the static
  public pages alongside public recipes and is cached for five minutes with a
  matching Cache-Control header, and robots.txt now disallows every
  authenticated and app-internal path (meals, meal plans, pay, and the rest)
  while allowing the public pages and referencing the sitemap.
- Updated dependencies [8f1506d]
  - @eciperay/types@1.34.2

## 1.34.1

### Patch Changes

- @eciperay/types@1.34.1

## 1.34.0

### Patch Changes

- 912dcd2: In the mobile app, an invalid or expired session token during the
  authenticated-session lifecycle now ends in the normal signed-out flow instead
  of surfacing as an unhandled error. A transient authentication-service outage
  no longer signs out a still-valid session (the server answers 503 for a
  transient token lookup failure instead of 401, and the unavailable lookup is
  logged server-side so the outage is visible to operators).
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

- f36abf3: An invalid or expired session token now ends in the normal signed-out
  flow instead of surfacing as an unhandled error. A transient
  authentication-service outage no longer signs out a still-valid session (the
  server answers 503 for a transient token lookup failure instead of 401), and a
  session the auth server reports as gone is treated as an invalid credential.
- 5061f61: A network-level fetch failure during the authenticated session sync
  (e.g. "Failed to fetch" when the API is momentarily unreachable) is now a
  handled failure instead of an unhandled exception: createApiClient surfaces it
  as a typed network error, and the session lifecycle reports it and keeps the
  still-valid session signed in rather than rethrowing it.
- b9331c9: A Perfected recipe can now be changed again: its detail page offers a
  Create draft action (web) / the Edit draft chip (app) that clones the locked
  active version into a new draft and opens it in the version editor. Creating
  the draft reopens the recipe to Evolving so the draft can actually be edited
  and saved, instead of the detail page offering no Edit control and the edit
  form failing with "Recipe cannot be modified in its current status". Abandoned
  recipes remain locked.
- 7debb33: Meal and meal-plan recipe picker suggestions can no longer contain
  the same recipe twice (#386). The picker search assembles its suggestions from
  every matching page of server search results, and the meal-plan picker
  concatenates its meal and recipe sources; both assemblies now dedupe by recipe
  id (entry key for meal-plan entries), first occurrence wins, so each recipe
  appears at most once in the suggestion list in the meal form and the meal-plan
  form, on web and in the app.
- 4f3d1b4: QA polish (#266): meal plan detail now labels its Nutrition goals
  figures with what was compared with your daily goals — the plan's per-day
  average when the plan has a valid date range ("Per-day average calories and
  protein for this plan…" caption on web, "(per-day avg)" row labels in the
  app), or the plan total for a plan without a valid date range, whose dates are
  optional and which the server compares by its whole-plan total ("Plan-total
  calories and protein for this plan…" caption on web, "(plan total)" row labels
  in the app) — so they no longer read as a wrong total next to "Plan total".
  Satiety is labelled a plan-wide score on both surfaces: it is computed from
  nutrient ratios, so it is neither a per-day average nor a plan total. Cook
  History entries can now be deleted: the server gains
  `DELETE /recipes/:id/versions/:versionId/cooks/:cookLogId` (own entries only),
  the client gains `cookLogs.remove`, and web Cook History shows a Delete
  control per entry with an in-page confirmation and an error alert if the
  delete fails.
- b4b590f: Meal and meal-plan recipe pickers are now a search autocomplete
  (#359), replacing the checkbox list of library options: type in the picker's
  search field and matching recipes are searched server-side and offered as
  results — select one to add it, and repeat to add more; selected recipes are
  listed separately under the search field, each with a Remove action and its
  servings stepper (meal plans: quantity steppers for meals and recipes, plus
  servings for recipes), and the steppers keep working for a selection that is
  not in the current search results. This removes the old picker's cap — it only
  ever offered the first 100 recipes in an account, so older recipes beyond that
  (for example in a large account) could not be added to a Meal or meal plan;
  now any recipe is reachable by searching for it, in the meal form and the
  meal-plan form on web and in the app (@spudly/ui 2.0.0's MealFormPage /
  MealPlanFormPage autocomplete contract). The server's recipe list ordering is
  now total: every sort branch ends with a unique version-id tie-breaker (and
  the shared-with-me newest order with the recipe id), so recipes that tie on
  the sort keys cannot be skipped or duplicated across page boundaries and
  search results have a deterministic order. If a picker search fails, the meal
  and meal-plan forms show a "Could not load recipes" error instead of reading
  as no matches.
- 2d2d424: Recipe search in the meal and meal-plan recipe pickers (and in the
  recipe list, shared-with-me list, and public discovery) now matches word by
  word: every word of the search text must appear somewhere in the recipe's
  title as a case-insensitive substring — on public discovery, in the title or
  the description — whatever order or spacing separates them, and irregular
  whitespace in the search text is collapsed before matching. Previously a
  search matched only when its words appeared as one contiguous phrase in the
  same order and spacing — in the title on the picker and list surfaces, or in
  the title or the description on public discovery — so a multi-word search
  could miss a recipe whose title held the same words separated by other words
  or punctuation, in a different order, or with different spacing — the class of
  picker miss investigated in #385. Single-word searches behave as before (any
  part of the title matches, not only a prefix), and the meal half of the
  meal-plan picker matches meal titles with the same word-by-word rule.
- Updated dependencies [1bf5611]
- Updated dependencies [f19b8b6]
- Updated dependencies [ed4ff5e]
  - @eciperay/types@1.34.0
