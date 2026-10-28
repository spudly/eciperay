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
covers the password-reset request against the QA dataset once the CI test
account secrets exist (issue #233); until then those cases remain manual. The
cases below are the manual remainder._

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
`packages/web/src/pages/auth/**`, `packages/server` auth/session code, Supabase
auth configuration changes.

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
4. **Detail tabs.** On a recipe with nutrition data and at least one cook log
   entry, walk the detail tabs: Overview, Ingredients, Instructions, Nutrition,
   Cook History, Comments. **Expected:** each tab renders its content with no
   empty-shell or error states; the Nutrition tab values match the recipe's
   stored nutrition.
5. **Post a comment.** In the Comments tab, post `QA — comment check`, then
   reload. **Expected:** the comment appears with the QA account as author and
   persists after reload.
6. **Delete.** Delete the `QA — Manual Entry Soup` recipe via the UI's delete
   path: on the recipe list (and on Home's recently-viewed cards) the Delete
   button arms an in-page **Confirm delete** / **Cancel** pair — Cancel keeps
   the recipe and restores the Delete button, Confirm delete removes it. The
   recipe detail page's Overview actions offer the same Delete control with the
   same in-page confirmation; confirming there returns to the recipe list.
   **Expected:** the deleted recipe disappears from the list and search; its old
   detail URL no longer renders the recipe; and if a delete request fails, an
   error is shown and the recipe stays listed (a delete never fails silently).
7. **Recipe without an image.** Open the image-less recipe. **Expected:** the
   detail and its list card render a clean placeholder — no broken image icon,
   no layout collapse.
8. **Create a draft from a Perfected recipe.** Open a Perfected recipe's detail
   and use its create-draft action (web: **Create draft**; app: the **Edit
   draft** chip). **Expected:** a new draft version is created from the
   Perfected version and opens in the version editor; changing the title and one
   ingredient there and saving succeeds (no "Recipe cannot be modified in its
   current status" error), the recipe's status shows Evolving, and the
   previously Perfected version remains available unchanged in the version
   history.
9. **Card meta and detail status polish (#278).** On `/recipes`, check the card
   subtitles: a 1-serving recipe reads "1 serving" (not "1 servings"), and a
   recipe whose nutrition is still being computed (e.g. one just created or
   renamed) reads "Satiety pending" — never a bare "Satiety…" that looks
   truncated; other cards show a satiety value or "Satiety —". Open one recipe's
   detail. **Expected:** the recipe status appears exactly once, as the pill in
   the toolbar above the tabs — the Overview does not repeat it under the title.

**Run when:**
`packages/app/src/screens/{Recipes,RecipeDetail,EditRecipe,EditVersion,ManualEntry}Screen.tsx`,
`packages/app/src/hosts/{recipe,recipes}/**`,
`packages/web/src/pages/{Recipes,RecipeDetail,EditRecipe,EditVersion,ManualEntry}Page.tsx`,
`packages/web/src/components/{recipe,recipes}/**`, `@spudly/ui` recipe form or
recipe page components, `packages/server` recipe routes.

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

_Automated: Jest covers the design-system CookLogForm component and the app
hosts that embed it. Playwright live `e2e-live/cook-log.spec.ts` covers the
cooking-mode surface against the QA dataset once the CI test account secrets
exist (issue #233): submitting the form (rating + notes) records the cook in the
recipe's history, and Skip dismisses it recording nothing; until then those
cases remain manual. The other surfaces (detail slot, list card, inline form)
and the cases below are the manual remainder._

**Preconditions:** QA account with at least one recipe; the cook log form
appears in four places and each is exercised: recipe detail (the
`renderCookLogForm` slot), the recipe list card, the inline form in the recipes
list view, and the cooking-mode overlay.

1. **Detail-slot submission, rating omitted.** Open a recipe, open the cook log
   form from the detail view, add notes only (no star rating), Save.
   **Expected:** the entry saves (rating is NOT required); the entry appears in
   Cook History with the notes shown.
2. **Notes trimming.** Submit an entry whose notes are only spaces.
   **Expected:** saves with no notes (empty becomes null) — the history entry
   shows no blank note block.
3. **List-card entry.** From the recipes list, open the cook log form on a
   recipe card, give a star rating and notes, Save. **Expected:** entry appears
   in that recipe's Cook History with the rating shown.
4. **Inline form entry.** In the recipes list view's inline cook log form,
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
   an entry's Delete control. **Expected:** an in-page confirmation appears (no
   browser dialog); Cancel keeps the entry; Confirm delete removes it and the
   history refreshes without it. If the delete request fails, an error alert
   appears on the entry and the entry stays listed (regression: #266).

**Run when (case 9):** `packages/web/src/components/recipe/CookHistoryTab.tsx`,
`packages/client/src/cookLogsApi.ts`, `packages/server` cook log routes,
`@spudly/ui` `RecipeDetailPage` history section.

**Run when:** `@spudly/ui` `CookLogForm` or `StarRatingInput`,
`packages/app/src/screens/CookingModeScreen.tsx`,
`packages/app/src/hosts/recipes/RecipesListView.tsx`,
`packages/web/src/pages/{RecipeDetail,CookingMode}Page.tsx`,
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

**Run when:**
`packages/app/src/screens/{MealsHub,MealDetail,MealEdit,MealCookingMode}Screen.tsx`,
`packages/web/src/pages/{MealsHub,MealDetail,MealEdit,MealCookingMode}Page.tsx`,
`packages/web/src/components/meals/**` (meal views), `packages/server` meal
routes.

---

## Meal plans

_Automated: Playwright `meal-plans.spec.ts` covers the plans list rendering;
Jest covers the meal plan detail/form views. Playwright live
`e2e-live/meal-plans.spec.ts` covers creating a dated plan with a recipe on it
and landing on its detail against the QA dataset once the CI test account
secrets exist (issue #233); until then that case remains manual. The cases below
are the manual remainder._

**Preconditions:** QA account with at least three recipes.

1. **Create a plan.** Create a meal plan (`/meal-plans/new`) named
   `QA — Week Plan` spanning a week. **Expected:** it appears in the plans list
   and opens to its detail (`/meal-plans/:planId`).
2. **Assign recipes to days.** In the plan detail/edit, assign recipes to
   specific days (breakfast/dinner slots as offered). Save, reload.
   **Expected:** assignments persist on the correct days.
3. **Move and remove entries.** Move one entry to another day and remove one
   entry entirely. **Expected:** detail reflects both changes; no duplicate or
   orphaned entries.
4. **Nutrition goal progress.** If the account has nutrition goals set, open the
   plan detail's nutrition goal progress. **Expected:** totals are plausible
   sums of the assigned recipes and the progress view renders for days with and
   without entries. For a plan with a valid date range, the goal figures are the
   plan's **per-day average** against the daily goals and are labelled as such
   ("Per-day average calories and protein for this plan, compared with your
   daily goals. Satiety is a plan-wide score." on web; "(per-day avg)" row
   labels in the app). For an undated plan (dates are optional), the figures are
   the **plan total** against the daily goals and are labelled as such
   ("Plan-total calories and protein for this plan, compared with your daily
   goals. Satiety is a plan-wide score." on web; "(plan total)" row labels in
   the app) — they must not be labelled as a daily average or read as an
   unexplained second total next to "Plan total" (regression: #266). Satiety is
   neither an average nor a total: it is a ratio-based score that is identical
   for the per-day and whole-plan figures, so both surfaces label it a plan-wide
   score (app row: "Satiety (plan-wide score)").
5. **Delete the plan.** Delete `QA — Week Plan`. **Expected:** gone from the
   list; member recipes unaffected.
6. **Direct `/meal-plans` visit + unknown routes (web).** Visit `/meal-plans`
   directly. **Expected:** you land on the Meals hub with the Meal plans tab
   active (`/meals?tab=plans`) and the plan list renders — no 404. Then visit a
   nonsense path (e.g. `/no-such-page`). **Expected:** the app's own "Page not
   found" page with a link home, never the raw framework error screen.

**Run when:**
`packages/app/src/screens/{MealPlanDetail,MealPlanEdit}Screen.tsx`,
`packages/app/src/hosts/meals/**`,
`packages/web/src/pages/{MealPlanDetail,MealPlanEdit}Page.tsx`,
`packages/web/src/components/meals/{MealPlanDetailView,MealPlanFormView,NutritionGoalProgressView}.tsx`,
`packages/web/src/routes/router.tsx`, `packages/server` meal plan routes.

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
`packages/web/src/pages/ShoppingListPage.tsx`,
`packages/web/src/components/meals/ShoppingListView.tsx`, `packages/server`
shopping list generation.

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
   junk recipe is created.
5. **Image import.** Add → Import from image (`/add/image`); upload a clear
   photo/scan of a printed recipe. **Expected:** extracted text reaches review
   in editable form; obvious misreads are correctable in review and the
   corrected version is what saves.
6. **Review-step corrections.** In review, fix a title, delete one ingredient,
   and edit a step before saving. **Expected:** the saved recipe matches the
   corrected review exactly.
7. **Duplicate awareness.** Import the same recipe twice. **Expected:** behavior
   matches the product's stated duplicate handling (a warning or a clearly
   separate copy) — flag whichever happens if it is neither.

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

_Automated: Jest covers the shared-with-me view/host and the public recipe page;
Playwright `signed-out.spec.ts` covers Discover rendering. The cross-account
cases below are manual._

**Preconditions:** Two accounts: the QA account (owner) and a second test
account (viewer); one QA recipe.

1. **Share with a user.** As owner, share `QA — Shared Pie` with the viewer
   account using the recipe's sharing controls. **Expected:** the recipe appears
   in the viewer's Shared with me (`/shared-with-me`) with owner attribution.
2. **Viewer is read-only.** As viewer, open the shared recipe. **Expected:**
   full detail renders; edit/delete controls are absent or clearly disabled; the
   owner-only actions (share, visibility) are not offered.
3. **Unshare.** As owner, remove the share. Reload as viewer. **Expected:** the
   recipe leaves Shared with me and its detail URL no longer opens for the
   viewer.
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

**Run when:** `packages/app/src/screens/SharedWithMeScreen.tsx`,
`packages/app/src/hosts/{shared,recipe/RecipeVisibilityControls}*`,
`packages/web/src/pages/{SharedWithMe,Discover,PublicRecipe}Page.tsx`,
`packages/web/src/components/{discover,public,shared}/**`, `packages/server`
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

1. **Feedback shortcut toggle.** In Profile, toggle the in-app feedback shortcut
   preference off, then on. **Expected:** off — the Feedback entry point
   disappears from the app navigation; on — it returns. Reload between toggles:
   the preference persists.
2. **Send feedback.** With the shortcut on, open Feedback and submit
   `QA — feedback check` (at most one submission per sweep; submissions reach
   the feedback triage). **Expected:** a sent confirmation; empty submissions
   are rejected with a message.
3. **Access tokens.** Create a personal access token named `QA — token check`;
   copy it at creation. **Expected:** the full token is shown once at creation
   and masked afterwards; the token appears in the list. Revoke it.
   **Expected:** it leaves the list and no longer authenticates (verify via an
   MCP/API call if tooling is at hand, otherwise record as unverified rather
   than skipping silently).
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
`packages/web/src/components/profile/**`, `packages/server`
profile/token/transfer routes, entitlement override handling.

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
2. **Pay page render.** Open `/pay`. **Expected:** the plans and prices render
   (Plus and Power, monthly and yearly) and match the amounts configured in the
   billing provider; selecting a plan proceeds toward checkout — STOP before any
   payment confirmation.
3. **Free-account upsell sanity.** On the Free account, open a plan-gated
   feature and the pay page. **Expected:** gating messages are human-readable
   and the upgrade path leads to `/pay`; no dead ends.
4. **Manage-subscription entry.** If the account shows a manage/billing portal
   entry, open it up to the portal handoff. **Expected:** the handoff targets
   the billing provider's portal (do not change any setting inside the portal
   during a sweep).

**Run when:** `packages/web/src/pages/PayPage.tsx`,
`packages/web/src/components/profile/{ProfileSubscriptionSection,SubscriptionView}.tsx`,
`packages/app/src/hosts/profile/**` (subscription parts), `packages/server`
billing/entitlement routes, plan catalog or pricing changes.

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

## Notes for whoever runs this plan

- Record which sections ran, on which environment/build, and the result of each
  numbered case; file failures as issues (one defect per issue) per the QA
  protocol, and link the issue from the run record.
- A case that cannot be executed (missing precondition, feature unreachable) is
  reported as blocked with the reason — never silently skipped.
- If a case's expected result no longer matches the product's intended behavior,
  that is a documentation bug: fix this document in the PR that changed the
  behavior.
