# @eciperay/client

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
