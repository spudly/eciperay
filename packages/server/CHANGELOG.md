# @eciperay/server

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

- f19b8b6: Meal and meal-plan writes are now protected against silent
  overwrites: the meal and meal-plan detail responses expose their `updatedAt`
  value as an `ETag`, and `PUT /meals/:id` / `PUT /meal-plans/:id` accept that
  value back — as an `If-Match` header or as an `expectedUpdatedAt` field in the
  request body. When the stored record has changed since the client's read, the
  PUT fails with `409` (`Meal has been modified since it was loaded` /
  `Meal plan has been modified since it was loaded`) and writes nothing, so the
  caller can re-read, re-merge, and retry. Clients that send no token keep the
  previous unconditional full-replace behavior.
- 8329874: Meal cooking mode no longer drops recipes from the combined cook plan
  (#346): buildMealCookPlan previously skipped any member recipe whose AI step
  timing was not 'ready' (generation failed or had not completed), so a
  multi-recipe meal silently presented only the recipes whose timing was ready —
  in the reported case, only the first recipe's steps ("Step 1 of 2"). Step
  timing is now treated as an estimate overlay only: every member recipe's steps
  are included in the plan, using stored durations or the existing five-minute
  default when none is stored, while the plan's timingStatus still reports
  'partial' or 'failed' when timing generation did not succeed for a recipe.
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
- f36abf3: An invalid or expired session token now ends in the normal signed-out
  flow instead of surfacing as an unhandled error. A transient
  authentication-service outage no longer signs out a still-valid session (the
  server answers 503 for a transient token lookup failure instead of 401), and a
  session the auth server reports as gone is treated as an invalid credential.
- 235177e: The server gains an opt-in fake Anthropic transport for QA
  environments, enabled by setting ECIPERAY_AI_FAKE=1. With the flag on, the
  Anthropic client answers from deterministic canned responses (recipe import
  parsing, tag selection, nutrition estimates, recipe descriptions,
  substitutions, step timing) instead of calling the real API, so the live
  Playwright QA suite exercises the AI-backed flows without consuming API
  credits (issue #336). The flag is off by default and production behavior is
  unchanged.
- 2ec90f2: Meal ETags no longer go stale when a member recipe changes: deleting
  a recipe now advances the `updated_at` of every meal that contained it, and a
  recipe edit — metadata-only (title, servings, image) or a full
  editable-version save — advances the member meals' `updated_at` atomically
  with the save. A meal's cached copy and its `If-Match` token therefore reflect
  recipe deletions and edits instead of silently matching the pre-change meal.
- cbdc21a: Meal plans with dates set no longer fail to create, update, or open:
  the server now handles the Date objects node-postgres returns for the plan's
  start/end date columns instead of throwing while building the response.
- 1ae8bed: Meal plans: saving a plan with start/end dates and loading the
  meal-plan list no longer fail with a 500 (#358, #360). Plan and meal
  timestamps are now returned as the ISO strings their types declare
  (node-postgres returns timestamptz columns as Date objects), a recipe with
  zero calories no longer throws out of the nutrition aggregation that plan and
  meal loads share, and creating or replacing a plan now writes the plan and its
  entries and reads the saved plan back in a single transaction, so a failed
  save cannot leave an orphan or partially emptied plan behind.
- b9331c9: A Perfected recipe can now be changed again: its detail page offers a
  Create draft action (web) / the Edit draft chip (app) that clones the locked
  active version into a new draft and opens it in the version editor. Creating
  the draft reopens the recipe to Evolving so the draft can actually be edited
  and saved, instead of the detail page offering no Edit control and the edit
  form failing with "Recipe cannot be modified in its current status". Abandoned
  recipes remain locked.
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
- Updated dependencies [912dcd2]
- Updated dependencies [1bf5611]
- Updated dependencies [f19b8b6]
- Updated dependencies [ed4ff5e]
- Updated dependencies [f36abf3]
- Updated dependencies [5061f61]
- Updated dependencies [bdb63f2]
- Updated dependencies [b9331c9]
- Updated dependencies [7debb33]
- Updated dependencies [4f3d1b4]
- Updated dependencies [b4b590f]
- Updated dependencies [2d2d424]
  - @eciperay/client@1.34.0
  - @eciperay/types@1.34.0
  - @eciperay/mcp-server@1.34.0
