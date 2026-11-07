# Manual Test Plan

Manual tests are the tests that are **not run via Jest or Playwright**. This
document is the maintained record of that non-automated test surface: the flows
that are visual, exploratory, gesture- or timing-based, dependent on real
external content, or otherwise unsuited to the automated suites. If a behavior
is covered by a Jest test or a Playwright test, it does not belong here; when a
manual case becomes automated, remove it from this document in the same PR that
adds the automation.

## How runs work

- **Selective runs (the norm).** Each feature section ends with a **Run when:**
  line naming the changes that trigger it (repo paths and/or `@spudly/ui`
  components/pages). A QA sweep for a change exercises the smoke baseline plus
  the sections whose triggers match the change's delta.
- **Full regression.** Run every section in this document. A full regression is
  run when explicitly requested, and is the right scope for major `@spudly/ui`
  upgrades or release-workflow changes.
- **Environment.** Runs execute against the QA preview environment
  (`eciperay-next`, backed by the Supabase QA dataset — see #234): sweeps run
  there, and PR-level passes run in the PR's own Fly review app, which targets
  the same QA dataset. Production (www.eciperay.com) gets only a post-release
  smoke check — the smoke baseline below, signed out. Findings are filed as
  GitHub issues per the QA protocol.
- **Seed data.** The QA account's standing starter library comes from the seed
  pass in `docs/qa-seed.md` — run it once the QA account exists, and again
  whenever the seed set changes.
- **Who runs it.** An AI agent driving a browser, or a person by hand. Steps are
  written so either can execute them.
- **Test data.** All data created during a run uses the dedicated QA account and
  names prefixed `QA —`. Clean up created data at the end of a run unless a case
  says to keep it for a later case in the same run.

## Maintaining this document

- **Every PR that adds or changes user-visible behavior updates this document in
  the same PR** — add cases for new behavior, adjust steps or expected results
  for changed behavior, and delete cases for removed behavior.
- PRs that do not change user-visible behavior (refactors, tooling, test
  infrastructure, dependency bumps with no behavior change) need no update.
- Keep cases concrete and executable: real screens, routes, and controls, with
  the expected result stated — not general intentions.
- When a case is automated (Jest or Playwright), remove it here and say so in
  the PR description.

## Smoke baseline — run on every sweep

No feature section substitutes for this baseline; it runs first, every time.

1. Open the site root (`/`). **Expected:** the page loads with no blank screen,
   no error overlay, and no uncaught console errors.
2. Sign in with the QA account. **Expected:** sign-in completes and lands on the
   signed-in home view.
3. Open Home. **Expected:** the home view renders, including the recently-viewed
   section when the account has viewed recipes.
4. Open Recipes (`/recipes`). **Expected:** the recipe list renders the
   account's recipes as cards; images load (no broken-image placeholders).
5. Open one recipe. **Expected:** the detail view renders title, image,
   ingredients, and instructions.
6. Sign out. **Expected:** returns to a signed-out view; visiting `/recipes`
   again redirects to sign-in.

---

## Authentication & account

_Automated: Jest covers the auth screens/forms (app `screens/auth/*`, web auth
pages); Playwright `signed-out.spec.ts` covers the redirect-to-sign-in and
sign-in render. Playwright live `e2e-live/auth.setup.ts` covers real sign-in;
`e2e-live/sign-out.spec.ts` covers real sign-out; and `e2e-live/auth.spec.ts`
covers the password-reset request once the CI test account secrets exist (issue
#233) — the Supabase recover call itself is intercepted and fulfilled with a
mocked success (issue #438), so that case verifies the confirmation UI only: it
does not exercise the QA auth endpoint and sends no real reset email; until then
those cases remain manual. The cases below are the manual remainder._

**Preconditions:** QA account credentials; a second browser profile or private
window for signed-out checks; access to the QA account's email inbox for
password-reset cases.

1. **Sign up with a new account.** From `/signup`, register with a fresh `+qa`
   alias email. **Expected:** account is created, the signed-in home renders,
   and the new library is empty (no sample or other users' data).
2. **Wrong-password sign-in.** Sign in with an incorrect password. **Expected:**
   a clear human-readable error (never a raw error code), no session is
   established, and the form stays usable for another attempt.
3. **Forgot/reset password round trip.** From `/forgot-password`, request a
   reset, follow the emailed link to `/reset-password`, set a new password.
   **Expected:** the new password signs in; the old password no longer does.
4. **Session persistence.** Sign in, reload the page, then open a second tab.
   **Expected:** still signed in in both, with no redirect flicker to the login
   page.
5. **Sign out everywhere effect.** Sign out, then use the browser Back button
   toward an authenticated page. **Expected:** no authenticated content is
   served from cache; the app redirects to sign-in.

**Run when:** `packages/app/src/screens/auth/**`,
`packages/web/src/pages/auth/**`, `@spudly/ui` `SignInPage`, `SignUpPage`,
`ForgotPasswordPage`, `ResetPasswordPage`, `packages/server` auth/session code,
Supabase auth configuration changes.

---

## Recipes — browse, create, edit, delete

_Automated: Jest covers the recipe form, list view, and detail hosts (app
`hosts/recipe/*`, `hosts/recipes/*`; web page tests); Playwright
`recipes.spec.ts` covers browse rendering, search narrowing, and opening a
detail. Playwright live `e2e-live/recipes.spec.ts` covers create (rendering on
the detail page and findable by search), edit-rename, and delete against the QA
dataset once the CI test account secrets exist (issue #233); until then those
cases remain manual. The cases below are the manual remainder._

**Preconditions:** QA account with at least two recipes (one with an image, one
without); one recipe may be created fresh in case 1.

1. **Manual entry end to end.** Go to Add → Manual entry (`/add/manual`). Create
   `QA — Manual Entry Soup` with servings, prep/cook times, at least three
   ingredients with quantities and units, two instruction steps, and a tag.
   Save. **Expected:** lands on the new recipe's detail; every field renders as
   entered, in source order.
2. **Edit and version note.** From the recipe detail, Edit
   (`/recipes/:recipeId/edit`); change the title suffix and one ingredient
   quantity; save. **Expected:** detail shows the edits; nothing else on the
   recipe changed (times, tags, image intact).
3. **Edit a past version.** Open the recipe's version history and edit a past
   version (`/recipes/:recipeId/versions/:versionId/edit`). **Expected:** the
   version editor opens with that version's content and saving behaves as the UI
   describes (no silent overwrite of the current version).
4. **Detail sections.** On a recipe with nutrition data and at least one cook
   log entry, walk the detail page's sections: Overview, Ingredients,
   Instructions, Nutrition, Cook History, Comments. **Expected:** each section
   renders its content with no empty-shell or error states; the Nutrition values
   match the recipe's stored nutrition.
5. **Post a comment.** In the Comments section, post `QA — comment check`, then
   reload. **Expected:** the comment appears with the QA account as author and
   persists after reload.
6. **Delete.** Delete the `QA — Manual Entry Soup` recipe from its detail page:
   the detail page's Delete control opens a confirmation dialog — Cancel keeps
   the recipe; confirming removes it and returns to the recipe list, and a
   failed delete shows its error in the dialog. (The recipe list itself offers
   no Delete — deleting is a detail-page action. Home's recently-viewed cards
   still carry their own Delete with the in-page **Confirm delete** / **Cancel**
   confirmation.) **Expected:** the deleted recipe disappears from the list and
   search; its old detail URL no longer renders the recipe; and if a delete
   request fails, an error is shown and the recipe stays listed (a delete never
   fails silently).
7. **Recipe without an image.** Open the image-less recipe. **Expected:** the
   detail and its list card render a clean placeholder — no broken image icon,
   no layout collapse.
8. **Create a draft from a Perfected recipe.** Open a Perfected recipe's detail
   and use its create-draft action (the **Edit draft** button on web and app
   alike since the detail pages adopted the design system page). **Expected:** a
   new draft version is created from the Perfected version and opens in the
   version editor; changing the title and one ingredient there and saving
   succeeds (no "Recipe cannot be modified in its current status" error), the
   recipe's status shows Evolving, and the previously Perfected version remains
   available unchanged in the version history.
9. **Card meta and detail status polish (#278).** On `/recipes`, check the card
   subtitles: a 1-serving recipe reads "1 serving" (not "1 servings"), and a
   recipe whose nutrition is still being computed (e.g. one just created or
   renamed) reads "Satiety pending" — never a bare "Satiety…" that looks
   truncated; other cards show a satiety value or "Satiety —". The subtitle
   carries no rating text: a rated recipe's rating renders as the row's star
   control, and an unrated recipe shows a single star (the log-a-cook control)
   instead. Open one recipe's detail. **Expected:** the recipe status appears
   exactly once, as the pill in the page toolbar — the Overview does not repeat
   it under the title (the design-system#363 duplicate was removed in @spudly/ui
   1.16.2).
10. **Condensed nutrition shows all five values (#361).** On `/recipes`, on a
    public discovery card (signed-out Discover), and on a shared-with-me card,
    check the subtitle of a recipe with ready nutrition. **Expected:** the
    condensed line shows calories, protein, carbs, and fat (each rounded, e.g.
    "400 cal · 20g protein · 40g carbs · 10g fat") followed by the satiety value
    — all five values without opening the recipe. A recipe whose nutrition is
    not ready shows no macro values and keeps the "Satiety pending" / "Satiety
    —" wording.

11. **Take a photo for a recipe image (#405).** On the recipe create/edit form,
    check the image controls: beside **Browse images** / **Choose image** there
    is a **Take photo** control. On a mobile browser (or a device with a
    camera), activating it opens the camera in place; taking a photo attaches it
    as the recipe image with the usual preview, and cancelling leaves the form
    unchanged. In the app, **Take photo** asks for camera permission first;
    denying it opens nothing and leaves the form unchanged. **Expected:** a
    captured photo flows through the same upload/preview path as a browsed or
    library-picked image.

12. **Crop a recipe image before saving (#406).** On the recipe create/edit
    form, pick or take a photo: before it is used, **Crop image** and **Use
    image** appear. **Use image** attaches the photo unchanged. Open **Crop
    image**, move/resize the crop box, and apply: the preview shows the cropped
    framing and the saved recipe's image is the cropped one. Repeat, but cancel
    the crop: the original, uncropped photo is attached instead. **Expected:**
    cropping is optional, never forced, and applies only to the pending recipe
    image (not meal photos or photo import).

**Run when:**
`packages/app/src/screens/{Recipes,RecipeDetail,EditRecipe,EditVersion,ManualEntry}Screen.tsx`,
`packages/app/src/components/recipe/**`,
`packages/app/src/lib/recipeImageCrop.ts`,
`packages/app/src/hosts/{recipe,recipes}/**`,
`packages/web/src/pages/{Recipes,RecipeDetail,EditRecipe,EditVersion,ManualEntry}Page.tsx`,
`packages/web/src/pages/RecipeDetailHost.tsx`,
`packages/web/src/components/{recipe,recipes}/**`,
`packages/web/src/lib/recipeImageCrop.ts`, `@spudly/ui` recipe form or recipe
page components, `packages/server` recipe routes,
`packages/client/src/recipeListDisplay.ts`, recipe nutrition summary fields in
`packages/types` / `packages/server` nutrition mapping.

---

## Servings & scaling controls

_Automated: Jest covers the design-system servings/scale component and the
recipe-detail host echo behavior. Playwright live `e2e-live/recipes.spec.ts`
covers the 2× scale preset doubling ingredient quantities on the recipe detail
against the QA dataset once the CI test account secrets exist (issue #233);
until then that case remains manual. Direct servings input, custom scale, and
invalid-input handling have no Playwright coverage. The cases below are the
manual remainder._

**Preconditions:** A QA recipe with servings = 4 and ingredient quantities that
scale visibly (e.g. 2 cups flour, 0.5 tsp salt), such as
`QA — Scaling Pancakes`.

1. **Direct servings input.** On the recipe detail, type a new servings value
   (e.g. 8) into the servings input instead of stepping. **Expected:**
   ingredient quantities rescale to match (2 cups → 4 cups); the input keeps the
   typed value.
2. **Preset scale chips.** Tap 1/2x, then 1x, then 2x, then 3x. **Expected:**
   quantities halve, restore, double, and triple exactly; the active chip is
   visually selected each time; at 1/2x, 0.5 tsp shows as a readable
   fraction/decimal, not 0 or blank.
3. **Custom scale.** Tap the custom scale control; it becomes a number input.
   Enter 1.5. **Expected:** quantities scale by 1.5 and the custom control shows
   as selected with its value (the host echoes the non-preset scale back);
   editing servings directly afterwards clears/replaces the custom state
   coherently.
4. **Invalid input resilience.** Enter 0, then a negative number, then
   non-numeric text in the servings and custom-scale inputs. **Expected:** no
   crash, no NaN quantities. Empty or non-numeric entries commit nothing — the
   field restores the current value and the last valid quantities stay. In the
   servings input, 0 or a negative number clamps to the minimum (1 serving) and
   quantities rescale to match; in the custom-scale input, a non-positive entry
   commits nothing and the current scale stays.
5. **Persistence of intent.** Scale to 2x, navigate away, and return.
   **Expected:** either the scale resets to 1x by design or persists — but
   whichever it does, quantities and the displayed scale agree.

**Run when:** `@spudly/ui` servings/scale components or `RecipeDetailPage`,
`packages/app/src/hosts/recipe/RecipeDetailView.tsx`,
`packages/web/src/pages/RecipeDetailPage.tsx`.

---

## Cook log

_Automated: Jest covers the design-system RatingForm component (the cook log
form's current name in `@spudly/ui`) and the app hosts that embed it. Playwright
live `e2e-live/cook-log.spec.ts` covers the cooking-mode surface against the QA
dataset once the CI test account secrets exist (issue #233): submitting the form
(rating + notes) records the cook in the recipe's history, and Skip dismisses it
recording nothing; until then those cases remain manual. The other surfaces
(detail slot, list row, inline form) and the cases below are the manual
remainder._

**Preconditions:** QA account with at least one recipe; the cook log form
appears in four places and each is exercised: recipe detail (the
`renderCookLogForm` slot), the recipe list row, the inline form in the recipes
list (opened from the row's rating control — the stars on a rated recipe, the
single star on an unrated one), and the cooking-mode overlay.

1. **Detail-slot submission, rating omitted.** Open a recipe, open the cook log
   form from the detail view, add notes only (no star rating), Save.
   **Expected:** the entry saves (rating is NOT required); the entry appears in
   Cook History with the notes shown.
2. **Notes trimming.** Submit an entry whose notes are only spaces.
   **Expected:** saves with no notes (empty becomes null) — the history entry
   shows no blank note block.
3. **List-row entry.** From the recipes list, open the cook log form via a
   recipe row's rating control, give a star rating and notes, Save.
   **Expected:** entry appears in that recipe's Cook History with the rating
   shown.
4. **Inline form entry.** With the recipes list's inline cook log form open,
   submit an entry. **Expected:** same result as case 3; the list does not lose
   scroll position or filters.
5. **Cooking-mode overlay.** Start cooking mode (`/recipes/:recipeId/cook`),
   finish, and complete the cook log form in the overlay. **Expected:** the
   entry saves and cooking mode exits cleanly to the recipe.
6. **Skip path.** Open the form at any call site and use Skip. **Expected:** the
   form dismisses with no entry created (verify in Cook History).
7. **Pending state.** On a slow connection (browser throttling), submit.
   **Expected:** Save disables while pending; double-taps do not create
   duplicate entries; Skip remains available per the form's design.
8. **Cooking mode before the recipe loads.** Open cooking mode directly
   (`/recipes/:recipeId/cook`, no `?versionId=`) on a throttled connection and
   try to reach the cook log form before the recipe finishes loading.
   **Expected:** no step controls, Done button, or cook log form is shown until
   the recipe has loaded — a cook log can never be submitted with an empty
   version (regression: #247).
9. **Delete an entry from Cook History (web).** In a recipe's Cook History, use
   an entry's Delete control. **Expected:** a confirmation dialog appears in the
   app (no browser-native dialog); Cancel keeps the entry; Confirm delete
   removes it and the history refreshes without it. If the delete request fails,
   an error alert appears in the dialog and the entry stays listed (regression:
   #266).

**Run when (case 9):** `packages/web/src/pages/RecipeDetailHost.tsx`,
`packages/client/src/cookLogsApi.ts`, `packages/server` cook log routes,
`@spudly/ui` `RecipeDetailPage` history section.

**Run when:** `@spudly/ui` `RecipesPage`, `RatingForm` or `StarRatingInput`,
`packages/app/src/screens/CookingModeScreen.tsx`,
`packages/app/src/hosts/recipes/RecipesListView.tsx`,
`packages/web/src/pages/{Recipes,RecipeDetail,CookingMode}Page.tsx`,
`packages/web/src/components/cooking/**`.

---

## Meals

_Automated: Jest covers the meals hub, meal form/detail hosts, and meal cooking
mode; there is no Playwright coverage of meals. The cases below are manual._

**Preconditions:** QA account with at least two recipes.

1. **Create a meal.** From the Meals hub (`/meals`), create `QA — Sunday Dinner`
   combining two recipes. Save. **Expected:** the meal detail (`/meals/:mealId`)
   lists both recipes.
2. **Edit a meal.** Edit the meal (`/meals/:mealId/edit`): remove one recipe,
   add a different one, rename. **Expected:** the detail reflects exactly the
   new set and name.
3. **Meal cooking mode.** Start cooking mode from the meal
   (`/meals/:mealId/cook`). Step through the combined instructions.
   **Expected:** steps from all member recipes are presented in a coherent
   order; exiting returns to the meal detail.
4. **Delete a meal.** Delete `QA — Sunday Dinner`. **Expected:** the meal is
   gone from the hub; the member recipes still exist untouched.
5. **Meal cooking mode load failure.** Set up a reproducible cook-plan failure:
   create a recipe with a title and ingredients but **no instruction steps**,
   then create `QA — No Steps Meal` whose only member is that recipe. (A recipe
   with zero instructions produces an empty cook-plan timeline, so the server
   answers the cook-plan request with 502 "Unable to build cook plan for this
   meal".) Open cooking mode for the meal (`/meals/:mealId/cook`). **Expected:**
   an error message ("Couldn't load the cook plan for this meal. Please try
   again.") with a Done action back to the meal detail — never an indefinite
   Loading state.
6. **Meal detail for a nonexistent meal.** Navigate directly to
   `/meals/not-a-uuid`. **Expected:** a "Page not found" view with a link home —
   never an indefinite Loading state.
7. **Picker search reaches the full library (regression: #359).** Preconditions:
   an account with more than 100 recipes. Open the meal form and type the title
   of a recipe beyond the first 100 into the picker's "Search recipes" field.
   **Expected:** the beyond-100 recipe appears as a search result and can be
   selected into the meal (it moves to the selected list under the search field,
   with its servings stepper); saving keeps it on the meal detail. Also confirm
   word-by-word matching (regression: #385): searching a word from the middle of
   a title (e.g. "First") and a multi-word partial title whose words are not the
   title's opening words (e.g. "First Soup" for a recipe titled "QA — First
   Soup") both surface the recipe; so do the same words in a different order
   ("Soup First") and words that are not contiguous in the title (e.g. "First
   Soup" for "QA — First Night Soup"), while a recipe whose title contains only
   one of the searched words (e.g. "First Course" for the search "First Soup")
   does NOT appear. Also confirm: a search with no matches shows "No recipes
   found.", selecting a result leaves the picker available to search and add
   another recipe, and a selected recipe's Remove action takes it back out.
   Repeat the search-and-select part in the meal-plan form (`/meal-plans/new`,
   "Search meals & recipes" field) — the same picker contract serves both forms
   (see also Meal plans case 7). (Runs execute in the QA preview environment
   defined under "How runs work" above; on any surface where writes are
   prohibited, verify read-only instead: confirm a beyond-100 recipe appears as
   a search result without saving.)
8. **Condensed nutrition shows all five values (#361).** Open a meal whose
   member recipes have ready nutrition. **Expected:** the meal total line and
   each member recipe's line on the meal detail show calories, protein, carbs,
   fat, and satiety (member values only for fields known for that recipe; a
   member with no nutrition shows no macro values). The same five values appear
   on meal-plan totals and entry lines.

**Run when:** `packages/client/src/mealUiHelpers.ts`,
`packages/app/src/screens/{MealsHub,MealDetail,MealEdit,MealCookingMode}Screen.tsx`,
`packages/app/src/screens/{MealPlanDetail,MealPlanEdit}Screen.tsx`,
`packages/web/src/pages/{MealsHub,MealDetail,MealEdit,MealCookingMode}Page.tsx`,
`packages/web/src/pages/{MealPlanDetail,MealPlanEdit}Page.tsx`,
`packages/server` meal plan routes, `packages/client/src/recipeListQuery.ts`,
`@spudly/ui` `MealsHubPage`, `MealDetailPage`, `MealFormPage`, or
`MealCookingModePage`, `packages/server` meal routes,
`packages/server/src/lib/saveMeal.ts`,
`packages/server/src/lib/conditionalWrite.ts`,
`packages/server/src/lib/mealSchemas.ts`, `packages/server` recipe search
(`packages/server/src/routes/recipes/{listFilterParams,sqlConstants}.ts`),
`packages/client/src/useMealPlanEditForm.ts`,
`packages/server/src/lib/saveRecipeMetadata.ts`,
`packages/server/src/lib/saveRecipeFromInput.ts`,
`packages/server/src/lib/saveMeal.ts`,
`packages/server/src/lib/touchMealsForRecipe.ts`,
`packages/server/src/db/migrations/020_meal_recipes_touch_meal.sql`.

---

## Meal plans

_Automated: Playwright `meal-plans.spec.ts` covers the plans list rendering;
Jest covers the meal plan detail/form views. Playwright live
`e2e-live/meal-plans.spec.ts` covers creating a dated plan with a recipe on it
and landing on its detail against the QA dataset once the CI test account
secrets exist (issue #233); until then that case remains manual. The cases below
are the manual remainder._

**Preconditions:** QA account with at least three recipes and at least one meal.
(The seed pass seeds recipes only — if the account has no meal, create one first
via Meals case 1 and do not delete it until this section is done.)

1. **Create a plan.** Create a meal plan (`/meal-plans/new`) named
   `QA — Week Plan` spanning a week. **Expected:** it appears in the plans list
   and opens to its detail (`/meal-plans/:planId`).
2. **Add meals and recipes as entries.** Meal plans have no day/slot concept: a
   plan is a list of entries (meals and recipes, each with a quantity/servings).
   In the plan edit form (Title, Notes, Starts on, Ends on, and the Meals &
   recipes checklist), add at least three entries in total, including at least
   one meal and one standalone recipe. Set a non-default quantity on at least
   one meal entry and a non-default quantity and servings on at least one recipe
   entry. Save, reload. **Expected:** the entries persist in the detail, in the
   order selected, with exactly those quantities/servings, and the plan totals
   reflect them.
3. **Reorder and remove entries.** The form has no drag or move control: an
   entry's position is its selection order, and unchecking then re-checking an
   entry moves it to the end of the list. Uncheck and re-check one entry so it
   moves to the end, save, reload. **Expected:** the detail shows the new order
   — the moved entry last, the others in their previous relative order. Then
   remove a different entry by unchecking its checkbox (the form has no separate
   remove control), save, reload. **Expected:** the removed entry is gone, the
   remaining entries keep their order, and there are no duplicate or orphaned
   entries.
4. **Nutrition goal progress.** If the account has nutrition goals set, open the
   plan detail's nutrition goal progress. **Expected:** totals are plausible
   sums of the assigned recipes and the progress view renders for days with and
   without entries. For a plan with a valid date range, the goal figures are the
   plan's **per-day average** against the daily goals and are labelled as such
   ("(per-day avg)" row labels in the app and on web). For an undated plan
   (dates are optional), the figures are the **plan total** against the daily
   goals and are labelled as such ("(plan total)" row labels in the app and on
   web) — they must not be labelled as a daily average or read as an unexplained
   second total next to "Plan total" (regression: #266). Satiety is neither an
   average nor a total: it is a ratio-based score that is identical for the
   per-day and whole-plan figures, so both surfaces label it a plan-wide score
   (row: "Satiety (plan-wide score)").
5. **Delete the plan.** Delete `QA — Week Plan`. **Expected:** gone from the
   list; member recipes unaffected.
6. **Direct `/meal-plans` visit + unknown routes (web).** Visit `/meal-plans`
   directly. **Expected:** you land on the Meals hub with the Meal plans tab
   active (`/meals?tab=plans`) and the plan list renders — no 404. Then visit a
   nonsense path (e.g. `/no-such-page`). **Expected:** the app's own "Page not
   found" page with a link home, never the raw framework error screen.
7. **Picker search reaches the full library (regression: #359).** Preconditions:
   an account with more than 100 recipes. Open the meal-plan form
   (`/meal-plans/new`) and type the title of a recipe beyond the first 100 into
   the picker's "Search meals & recipes" field. **Expected:** the beyond-100
   recipe appears as a search result and can be selected into the plan (it moves
   to the selected list under the search field, with its quantity and servings
   steppers); saving keeps it on the plan detail after reload. Also confirm a
   match that sits behind more than one page of newer substring matches (an
   older recipe whose title is contained in 20+ newer titles) is reachable by
   typing its full title. Fixture for that last check (the standing QA seed in
   `docs/qa-seed.md` has only three recipes, so build this one in the QA account
   first and delete it afterwards): create a recipe titled `QA — Paging Soup`
   FIRST, then create at least 21 newer recipes whose titles all contain that
   exact string (e.g. `QA — Paging Soup 01` through `QA — Paging Soup 21`,
   created in any order after it). Because search is newest-first, the older
   `QA — Paging Soup` then sits behind a full page of newer substring matches;
   typing its full title must still surface it as a selectable result.

**Run when:**
`packages/app/src/screens/{MealPlanDetail,MealPlanEdit}Screen.tsx`,
`packages/app/src/hosts/meals/**`,
`packages/web/src/pages/{MealPlanDetail,MealPlanEdit}Page.tsx`, `@spudly/ui`
`MealPlanDetailPage` or `MealPlanFormPage`,
`packages/client/src/recipeListQuery.ts`, `packages/web/src/routes/router.tsx`,
`packages/server` meal plan routes, `packages/server/src/lib/saveMealPlan.ts`,
`packages/server/src/lib/conditionalWrite.ts`,
`packages/server/src/lib/mealSchemas.ts`.

---

## Shopping list

_Automated: Jest covers the shopping list screen/view rendering. Playwright live
`e2e-live/meal-plans.spec.ts` (the meal-plan flow) covers generating a plan's
shopping list and checking off an item against the QA dataset once the CI test
account secrets exist (issue #233); until then those cases remain manual.
Consolidation, quantity doubling, regeneration, check-off persistence, and
empty-plan behavior below are the manual remainder._

**Preconditions:** A QA meal plan with at least two recipes sharing one
ingredient (e.g. both use eggs) and one recipe assigned twice in the week.

1. **Generate from a plan.** Open the plan's shopping list
   (`/meal-plans/:planId/shopping-list`). **Expected:** items from all assigned
   recipes appear; the shared ingredient is consolidated, and the twice-assigned
   recipe's quantities are doubled.
2. **Check-off persistence.** Check off two items, reload the page.
   **Expected:** checked state persists; checked items are visually distinct but
   still readable.
3. **Regeneration sanity.** Change the plan (remove one recipe), reopen the
   shopping list. **Expected:** the list matches the current plan — removed
   recipe's unique items are gone; nothing references the old plan state.
4. **Empty plan.** Generate a shopping list for a plan with no entries.
   **Expected:** a clear empty state, not an error or a stale list.

**Run when:** `packages/app/src/screens/ShoppingListScreen.tsx`,
`packages/web/src/pages/ShoppingListPage.tsx`, `@spudly/ui` `ShoppingListPage`,
`packages/server` shopping list generation.

---

## Imports

_Automated: Jest covers the import screens and the review screen's rendering;
Playwright live `e2e-live/imports.spec.ts` covers text import end-to-end against
the QA dataset once both prerequisites exist as CI secrets — the CI test account
and the Anthropic API key (text import parses with Anthropic server-side, so the
spec skips while either is missing; issue #233). Extraction quality against
real-world sources is inherently manual._

**Preconditions:** QA account; the sample inputs named in each case (keep a
small set of known inputs so results are comparable across runs).

1. **Text paste.** Add → Import from text (`/add/text`); paste a complete recipe
   (title, servings, ingredients with quantities, numbered steps). Continue to
   review (`/import/review/:recipeId`). **Expected:** title, servings,
   ingredients, and steps land in the right fields, in order.
2. **Text paste, messy input.** Paste a recipe with fractions (½ cup), ranges,
   and notes in parentheses. **Expected:** quantities parse sensibly; qualifiers
   land in ingredient notes rather than corrupting the quantity; anything
   unparsed is visible in review, not silently dropped.
3. **URL import.** Add → Import from URL (`/add/url`) with a recipe page from a
   mainstream recipe site. **Expected:** the importer extracts title, image,
   ingredients, and steps; review shows the extracted recipe, and saving adds it
   to the library.
4. **URL import failure.** Submit a URL that is not a recipe (e.g. a news
   article). **Expected:** a clear "couldn't find a recipe" style message; no
   junk recipe is created. Also submit a recipe URL whose page cannot be fetched
   (a site that blocks the importer, or an unreachable URL). **Expected:** a
   "couldn't fetch that page — the site may be blocking imports" style message
   suggesting pasting the recipe text instead. A generic "Internal server error"
   or "AI service error" for either failure is a defect (issue #297). 4b. **URL
   import from a bot-refusing site.** Submit the URL of a recipe page on a site
   that refuses the importer's bot agent but serves browsers (e.g.
   browneyedbaker.com, issue #400). **Expected:** the importer retries with
   browser headers and the recipe imports successfully, reaching review like
   case 3 — not the case-4 fetch-failure message.
5. **Image import.** Add → Import from image (`/add/image`); upload a clear
   photo/scan of a printed recipe. **Expected:** extracted text reaches review
   in editable form; obvious misreads are correctable in review and the
   corrected version is what saves.
6. **Review-step corrections.** In review, fix a title, delete one ingredient,
   and edit a step before saving. **Expected:** the saved recipe matches the
   corrected review exactly.
7. **Duplicate awareness.** Import the same recipe twice (issue #296).
   **Expected:** the second import stops with a warning naming the existing
   library recipe — a recipe is a duplicate when its normalized title AND
   normalized ingredient list match an existing recipe in the same library — and
   no second copy is created. Choosing to import anyway after the warning
   (re-submitting the same import, or the "Import anyway" action on the app
   image import) creates the second copy. Applies to text, URL, and image
   imports.

**Run when:**
`packages/app/src/screens/{ImportText,ImportUrl,ImportImage,ImportReview}Screen.tsx`,
`packages/web/src/pages/{ImportText,ImportUrl,ImportImage,ImportReview}Page.tsx`,
`packages/server` import/extraction routes, AI extraction prompts.

---

## AI recipe creation & tweak

_Automated: Jest covers the AI session flow host and the generate/tweak screens'
rendering; live model behavior is manual. Keep to the per-sweep AI call budget
in the QA protocol._

**Preconditions:** QA account with the comp (Power) override so AI features are
ungated; at least one existing recipe for the tweak cases.

1. **Generate session.** Add → Create with AI (`/add/ai`); describe a dish ("a
   weeknight chicken stir-fry, no peanuts") and run the session to a finished
   recipe. **Expected:** the session asks sensible clarifying questions (or
   proceeds when the prompt is complete), produces a coherent recipe (title,
   ingredients with quantities, ordered steps), and saving adds it to the
   library as `QA — AI …`.
2. **Constraint respect.** In the generated recipe, verify the stated constraint
   (no peanuts) holds in ingredients and steps. **Expected:** no violating
   ingredient appears.
3. **Tweak with AI.** Open a recipe → Tweak with AI
   (`/recipes/:recipeId/tweak-ai`); request a concrete change ("make it
   vegetarian"). **Expected:** the proposed version reflects the change and only
   the change (quantities/servings not silently altered); the original recipe is
   untouched until the tweak is accepted/saved.
4. **Abandon a session.** Start a generate session, answer once, then navigate
   away mid-flow. **Expected:** no half-created recipe appears in the library.
5. **Plan gating (signed-out/lower plan check).** On an account WITHOUT the comp
   override (or signed out, if reachable), open the AI entry point.
   **Expected:** a human-readable plan-required message/upsell, never a raw
   `plan_required` error string.

**Run when:** `packages/app/src/screens/{GenerateAi,TweakAi}Screen.tsx`,
`packages/app/src/hosts/ai/**`,
`packages/web/src/pages/{GenerateAi,TweakAi}Page.tsx`,
`packages/web/src/pages/AiSessionHost.tsx`, `packages/server` AI routes/prompts,
entitlement gating for AI features.

---

## Sharing, Discover & public pages

_Automated: Jest covers the unified Recipes host (own + shared + discovery
sections) and the public recipe page; Playwright `signed-out.spec.ts` covers
Discover rendering. The cross-account cases below are manual._

**Preconditions:** Two accounts: the QA account (owner) and a second test
account (viewer); one QA recipe.

1. **Share with a user.** As owner, share `QA — Shared Pie` with the viewer
   account using the recipe's sharing controls. **Expected:** the recipe appears
   in the viewer's unified Recipes browse (`/recipes`), in the "Your recipes"
   section with a Shared badge and owner attribution; `/shared-with-me`
   redirects to `/recipes`.
2. **Viewer is read-only.** As viewer, open the shared recipe. **Expected:**
   full detail renders; edit/delete controls are absent or clearly disabled; the
   owner-only actions (share, visibility) are not offered.
3. **Unshare.** As owner, remove the share. Reload as viewer. **Expected:** the
   recipe leaves the viewer's unified Recipes browse and its detail URL no
   longer opens for the viewer.
4. **Public visibility.** Set a recipe's visibility to public and open its
   public page (`/recipe/:id/:slug`) signed out. **Expected:** the public page
   renders the recipe with sign-up CTAs; no private account data (email, other
   recipes) is exposed.
5. **Private means private.** Set the recipe back to private and reload the
   public URL signed out. **Expected:** the public page no longer serves the
   recipe (not-found/redirect behavior).
6. **Discover.** Signed out, open `/discover` and open a public recipe from it.
   **Expected:** only public recipes are listed; the opened public page matches
   case 4.
7. **Unified browse + header search.** Signed in, open `/recipes`. **Expected:**
   "Your recipes" (own recipes first, then shared-with-me recipes badged Shared)
   sits above the Discover section of public recipes, all under one
   search/filter bar; searching from the shell header lands on `/recipes` with
   that search applied to every section.

**Run when:** `packages/app/src/screens/SharedWithMeScreen.tsx`,
`packages/app/src/hosts/{shared,recipe/RecipeVisibilityControls}*`,
`packages/web/src/components/recipe/RecipeVisibilityControls.tsx`,
`packages/web/src/pages/{Recipes,Discover,PublicRecipe}Page.tsx`,
`packages/web/src/components/AppShell.tsx`,
`packages/web/src/routes/router.tsx`,
`packages/web/src/pages/MarketingLandingPage.tsx`,
`packages/web/src/pages/legal/**`, `packages/web/src/components/shared/**`,
`@spudly/ui` `DiscoverPage`, `PublicRecipePage`,
`packages/web/src/components/PublicHeader.tsx`, `packages/server`
sharing/visibility routes.

---

## Search & tags

_Automated: Playwright `recipes.spec.ts` covers basic search narrowing; Jest
covers the tags screen rendering. The cases below are manual._

**Preconditions:** QA account with recipes whose titles, ingredients, and tags
differ distinctly (e.g. `QA — Tomato Soup` tagged `QA — Weeknight`; a pancake
recipe containing "buttermilk").

1. **Search by ingredient.** Search "buttermilk". **Expected:** the pancake
   recipe is found even though the word is not in its title.
2. **Search no results.** Search a nonsense string. **Expected:** a clear empty
   state (not a spinner forever, not the full list).
3. **Tag filtering.** Filter/browse by the `QA — Weeknight` tag from the Tags
   page (`/tags`). **Expected:** only recipes carrying that tag are listed.
4. **Tag management.** Create a tag, rename it, then delete it. **Expected:**
   renames reflect on tagged recipes; deleting a tag does not delete or corrupt
   the recipes that had it.
5. **Combined state.** Apply a tag filter, then search within it, then clear
   both. **Expected:** the full list restores; no stale filter chips remain.

**Run when:** `packages/app/src/screens/{Tags,Recipes}Screen.tsx`,
`packages/web/src/pages/{Tags,Recipes}Page.tsx`, `@spudly/ui` `TagsPage`,
`packages/server` search/tag routes.

---

## Profile & settings

_Automated: Jest covers the profile sections (subscription, access tokens,
nutrition goals, feedback preference) and Playwright `profile.spec.ts` covers
plan-state rendering and section layout. The cases below are manual._

**Preconditions:** QA account signed in at Profile (`/profile`).

1. **Feedback shortcut toggle + analytics consent.** In Profile, the feedback
   preference shows the current analytics consent state (Accepted / Declined /
   Not set) with an action to change it. Toggle the shortcut off, then on.
   **Expected:** off — the Feedback entry point disappears; turning it on
   re-presents the analytics consent prompt even if consent was decided before —
   Accept keeps the shortcut on and the Feedback entry point returns; Decline
   shows an error and forces the preference back off. Reload between toggles:
   the preference and the consent state persist.
2. **Send feedback.** With the shortcut on, open Feedback and submit
   `QA — feedback check` (at most one submission per sweep; submissions reach
   the feedback triage). **Expected:** a sent confirmation; empty submissions
   are rejected with a message. Repeat the open step at a 320×568 viewport (and
   at 200% zoom): **Expected:** the panel stays within the viewport and scrolls
   internally, so every field and both actions (Cancel and Submit feedback) are
   reachable.
3. **Access tokens.** Create a personal access token named `QA — token check`;
   copy it at creation. **Expected:** the full token is shown once at creation
   and masked afterwards; the token appears in the list. Revoke it.
   **Expected:** the token stays in the list as an annotated "(Revoked)" row (an
   audit trail that it was revoked), its Revoke action is gone, and it no longer
   authenticates (verify via an MCP/API call if tooling is at hand, otherwise
   record as unverified rather than skipping silently).
4. **Nutrition goals.** Set daily goals (calories, protein, carbs, fat) in the
   nutrition goals form; save; reload. **Expected:** values persist and meal
   plan progress (see Meal plans, case 4) uses the new goals. Clear one goal.
   **Expected:** that goal's progress display degrades gracefully (no NaN or
   error).
5. **Transfer recipes — export.** Use Transfer recipes → Export. **Expected:** a
   file downloads containing the account's recipes.
6. **Transfer recipes — import round trip.** Import the exported file back.
   **Expected:** the flow completes and reports what was imported; no existing
   recipe is silently overwritten or corrupted (duplicates follow the import
   duplicate behavior and are reported).

**Run when:** `packages/app/src/screens/ProfileScreen.tsx`,
`packages/app/src/hosts/profile/**`, `packages/web/src/pages/ProfilePage.tsx`,
`packages/web/src/components/profile/**`,
`packages/web/src/components/FeedbackBubble.tsx`,
`packages/web/src/components/FeedbackForm.tsx`, `packages/web/src/index.css`
(the `.feedback-panel` sizing), `packages/server` profile/token/transfer routes,
entitlement override handling.

---

## Billing & plans — OBSERVE-ONLY

_Automated: Jest covers the subscription section and the pay page rendering;
Playwright `profile.spec.ts` covers plan-state rendering. Money movement is
never exercised in manual runs either._

**Hard rule: never complete a real checkout.** Do not enter real payment
details, do not confirm a purchase, and stop at the point where the next step
would charge. Billing findings park for the account owner rather than flowing
into the normal fix queue (per the QA protocol).

**Preconditions:** QA account (comp override = Power); optionally a second
account on the Free plan for case 3.

1. **Current plan display.** Open Profile → subscription section. **Expected:**
   the plan shown (Free / Plus / Power) matches the account's actual entitlement
   — for the QA account, Power via the comp override, presented without error or
   a spurious "subscribe" upsell blocking the page.
2. **Subscription information and prices.** Open Profile → subscription section.
   **Expected:** the section shows the account's current plan and, where the
   entitlement carries one, its status text (e.g. an active renewal date or a
   payment-past-due notice). When no status text applies, it shows the
   informational price hint — Plus ($3.99/mo) and Power ($8.99/mo) with a
   one-line summary of what each adds — matching the amounts configured in the
   billing provider. The web profile offers no plan catalog, no monthly/yearly
   selector, and no checkout start: do not look for upgrade controls there.
   Where the account has a billing-portal link, a Manage subscription action is
   also shown (case 4). `/pay` itself is NOT a plans page: it is the Paddle
   checkout-completion target. Open `/pay` bare (no `_ptxn` parameter).
   **Expected:** a Checkout card explaining it needs the checkout link from a
   purchase started elsewhere — no plan prices render there.
3. **Free-account upsell sanity.** On the Free account, open a plan-gated
   feature and the Profile subscription section. **Expected:** gating messages
   are human-readable, and the subscription section shows the Free plan with the
   informational Plus/Power price hint (the Free-plan upsell). There is no
   checkout start in the web profile, so there is no upgrade flow to follow from
   there — the hint rendering correctly, with no dead-end controls, is the pass.
4. **Manage-subscription entry.** If the account shows a manage/billing portal
   entry, open it up to the portal handoff. **Expected:** the handoff targets
   the billing provider's portal (do not change any setting inside the portal
   during a sweep).

**Run when:** `packages/web/src/pages/PayPage.tsx`,
`packages/web/src/components/profile/{ProfileSubscriptionSection,SubscriptionView}.tsx`,
`packages/app/src/hosts/profile/**` (subscription parts), `packages/server`
billing/entitlement routes, plan catalog or pricing changes.

---

## Web — Privacy choices / consent management

_Preconditions: signed-out browser session and the QA account; a browser profile
where analytics (PostHog) is configured._

1. **Footer link opens the surface (signed out).** From a public page, use the
   "Do Not Sell or Share My Personal Information" footer link. **Expected:** the
   privacy choices page at `/privacy/consent` opens, showing the current choice
   (Not set on a fresh profile).
2. **Accept takes effect immediately.** Choose Accept on the privacy choices
   page. **Expected:** the choice shows Accepted, persists across a reload, and
   analytics is enabled without a second reload.
3. **Withdraw returns to undecided.** Choose Withdraw consent. **Expected:** the
   stored choice is removed, the page shows Not set, analytics is off, and the
   consent banner re-presents on the next page view, exactly as for a new
   visitor.
4. **Decline persists.** From the banner or the privacy choices page, decline.
   **Expected:** no analytics collection, the choice shows Declined after
   reload, and the banner does not re-appear.
5. **Profile interplay (#256).** In Profile preferences, withdraw consent while
   the feedback shortcut is on. **Expected:** the shortcut is forced off with
   the explanatory message; re-enabling it re-presents the consent prompt.

**Run when:** `packages/client/src/analyticsConsent.ts`,
`packages/web/src/pages/ConsentPreferencesPage.tsx`,
`packages/web/src/components/AnalyticsConsentBanner.tsx`,
`packages/web/src/components/ProfileFeedbackPreference.tsx`,
`packages/web/src/lib/analytics.ts`, footer/legal-link data changes.

---

## Visual & responsive

_Automated: Playwright `mobile-web.spec.ts` covers 390px/430px layout checks
(nav reachability, card widths, title readability); the design system's Android
visual regression covers native story rendering. The exploratory visual pass
below is manual._

**Preconditions:** Browser with device emulation; QA account with enough content
to fill lists (recipes with long titles, long ingredient names, and missing
images included).

1. **Mobile-width pass (390px).** Walk Home, Recipes, one recipe detail, Meals
   hub, one meal plan, Shopping list, Profile. **Expected:** no horizontal
   scrolling, no clipped labels or overlapping controls, tap targets usable,
   bottom navigation fully reachable.
2. **Long-content stress.** Open the recipe with the longest title and
   ingredient names at 390px and at desktop width. **Expected:** text wraps or
   truncates gracefully; cards in a row keep consistent heights or a deliberate
   ragged layout — no overflow into neighboring cards.
3. **Images.** Scan the recipes list and Discover for image rendering.
   **Expected:** every image loads; aspect ratios are consistent; missing images
   show the placeholder (see Recipes, case 7).
4. **Cooking mode readability.** Open cooking mode on web and in the app at
   arm's-length readability: current step is prominent, completed/upcoming steps
   distinguishable, and the step controls are reachable without precision
   tapping.
5. **Empty states tour.** On a fresh account (or after cleanup), visit Recipes,
   Meals, Meal plans, Shared with me, Search. **Expected:** each shows a
   designed empty state with a sensible next action — never a blank page or a
   raw error.

**Run when:** any `@spudly/ui` release adoption, theme/token changes,
`packages/web/src/components/ui/**`, navigation/AppShell changes,
`packages/app/src/navigation/**`.

---

## MCP recipe content edits

Runs against a deployed environment with the MCP server connected to the QA
account (never production data — content edits create real versions).

1. **Branch from the active version (default).** Pick a QA recipe; note its
   active `versionId`/`versionNumber` from `get_recipe`. Call `update_recipe`
   with that `versionId` and a changed ingredient list, without `activate`.
   **Expected:** the result is a new version (number incremented, `derivedRole`
   draft) carrying the new content; `get_recipe` still shows the previously
   active version unchanged, and the prior version is intact in the version
   history.
2. **Atomic activation.** Repeat case 1 on another QA recipe with
   `activate: true`. **Expected:** the result's `derivedRole` is active and
   `get_recipe` shows the new content under the new version number; the new
   version's nutrition status reaches ready without any app interaction.
3. **Metadata-only call unchanged.** Call `update_recipe` with only `servings`
   (no `versionId`). **Expected:** the value changes in place, no new version is
   created.
4. **Missing versionId refused.** Call `update_recipe` with a changed ingredient
   list and no `versionId`. **Expected:** a clear error naming `versionId`; no
   version is created and nothing changes.

**Run when:** `packages/mcp-server`,
`packages/server/src/routes/recipes/editVersionContent.ts`, recipe version
routes in `packages/server`.

---

## Notes for whoever runs this plan

- Record which sections ran, on which environment/build, and the result of each
  numbered case; file failures as issues (one defect per issue) per the QA
  protocol, and link the issue from the run record.
- A case that cannot be executed (missing precondition, feature unreachable) is
  reported as blocked with the reason — never silently skipped.
- If a case's expected result no longer matches the product's intended behavior,
  that is a documentation bug: fix this document in the PR that changed the
  behavior.
