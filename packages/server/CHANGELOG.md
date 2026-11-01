# @eciperay/server

## 1.34.0

### Patch Changes

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
- 235177e: The server gains an opt-in fake Anthropic transport for QA
  environments, enabled by setting ECIPERAY_AI_FAKE=1. With the flag on, the
  Anthropic client answers from deterministic canned responses (recipe import
  parsing, tag selection, nutrition estimates, recipe descriptions,
  substitutions, step timing) instead of calling the real API, so the live
  Playwright QA suite exercises the AI-backed flows without consuming API
  credits (issue #336). The flag is off by default and production behavior is
  unchanged.
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
- Updated dependencies [ed4ff5e]
- Updated dependencies [b9331c9]
- Updated dependencies [4f3d1b4]
  - @eciperay/types@1.34.0
  - @eciperay/client@1.34.0
  - @eciperay/mcp-server@1.34.0
