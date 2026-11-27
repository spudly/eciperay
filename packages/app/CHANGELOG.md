# @eciperay/app

## 1.35.0

### Minor Changes

- 695ba21: Family sharing, Profile UI (#617, tranche 2): the Profile page (web
  and native) gains a Family sharing section — designate another Eciperay user
  by account email, see current designations, and remove one with confirmation
  (removal ends that person's automatic access immediately). The client account
  API gains list/create/delete family-sharing calls against the tranche-1
  endpoints. Recipes shared via a family designation now carry a "Family" badge
  in Shared With Me / the unified Recipes browse instead of the generic "Shared"
  badge.
- e7d6339: Recipe search now speaks GitHub-style syntax: plain words match the
  title, description, or an ingredient name, and the search box accepts quoted
  phrases, field qualifiers (`title:`, `desc:`, `ingredient:`, `tag:`), negation
  (`-ingredient:peanuts`), status/scope qualifiers (`status:`, `is:public`), and
  numeric comparisons (`calories:<600`, `rating:>=4`) — identically across your
  recipes, shared-with-me, and public discovery.
- 7ee7ff6: Net carbs (carbs − fiber) now render beside total carbs everywhere a
  recipe's carbs are shown: the recipe-detail nutrition rows, recipe card/list
  summaries, meal and meal-plan totals and per-day rows, and meal member lines
  on web and native. Net carbs is omitted where fiber is unknown — including
  meal/plan totals when any contributing recipe's fiber is unknown (aggregate
  fiber now propagates unknown instead of treating it as zero) — and plan/meal
  totals compute it from the summed carbs and fiber via the one canonical
  helper.
- 3ac1d11: Remove the recipe status entirely (#610, tranche 2): recipes no
  longer carry an idea/evolving/perfected/abandoned status. The `RecipeStatus`
  type and the status field are gone from `@eciperay/types` recipe inputs and
  details, recipe detail pages and cards no longer show a status badge, the
  recipe forms and the recipe-list status filter no longer offer a status
  control, and the `PATCH /recipes/:id` status endpoint is removed. Because
  perfected/abandoned no longer lock a recipe, every recipe stays editable, and
  version activation follows the cook-log/archived rule only. The server drops
  the `recipes.status` column (migration 030), and the MCP recipe-update payload
  no longer carries a status field.
- aa849a6: "Show less like this" (#623): a new soft negative signal for
  discovery. Migration 032 adds `recipe_show_less` (user + source recipe,
  mirroring the hard-hide `recipe_disinterest` shape). Choosing "Show less like
  this" on a recipe records it as a source, and the discovery feed now
  down-ranks other recipes similar to a source — sharing a tag or the same
  author — by 2 points per matching source, capped at 6, so similar recipes
  appear less often but are never removed. The source recipe itself is not
  penalised, an explicit save or cook of a recipe cancels its penalty, and hard
  hide still excludes outright. New authenticated routes
  (`POST`/`DELETE /discovery/recipes/:id/show-less`, `GET /discovery/show-less`)
  back a new Settings "Show less like this" list in the web and native profile
  screens, next to Hidden recipes, where each entry can be undone — entries
  persist until undone, with no decay. The card-menu action itself is pending a
  design-system slot for discovery-card actions (the DS discovery item carries
  no action props today); the client API (`eciperay.discovery`) ships ready for
  it.
- caf3abb: Tag management is admin-only (#621, option B): migration 031 adds a
  `users.is_admin` boolean (default false) that defines admin. A new server
  `requireAdmin` middleware gates `POST /tags`, `PATCH /tags/:id`, and
  `DELETE /tags/:id` with 403 for non-admins, while `GET /tags` stays available
  to every signed-in user (tag pickers and filtering read it; recipe save
  resolves tag names server-side and is unaffected). The new `GET /auth/me`
  profile response exposes the server-computed `isAdmin` flag on the shared
  `User` type and client auth API. On web, the Tags nav entry is hidden for
  non-admins and the `/tags` route redirects non-admins to `/recipes`; on
  native, the Tags screen is not registered and the profile Tags link is hidden
  for non-admins. On web, a failed profile load renders through design-system
  composition only (the DS error page in the admin guard; a DS header retry
  action in the signed-in shell) — no app-styled error panels.

### Patch Changes

- 2474422: Add the editor ingredient-linking correction UI (#643 tranche 2c):
  the recipe editor (web and native) now shows which ingredients each
  instruction step references, warns about named ingredients no step references,
  and offers a Mealie-style per-step checklist walk-through to add or remove
  links, plus a "Suggest links with AI" action that applies the tranche 2b
  linking proposal to the form. Links persist through the normal recipe save
  path; recipe detail now round-trips ingredient IDs and instruction
  `ingredientReferences` into the form so existing links survive an edit, and
  removing an ingredient strips its links from every step.
- 6adb307: Adopt @spudly/ui 14.0.0 across the web and app hosts: the recipe
  detail nutrition section now renders the DS Nutrition Facts label from
  structured facts, cook-log forms on the recipe detail and browse pages render
  through the DS RatingForm data props, the parsed-recipe preview, profile legal
  links, sign-up legal notice, and sharing consent cross as data spans, the
  profile page takes its nutrition-goals and access-tokens sections as data
  props, and the recipe form drops its status field (the DS form no longer
  carries one; the status still saves with the recipe).
- 4c529b9: Move the profile/recipe data hooks into @eciperay/client (#676): the
  access-tokens, recipe sharing, and recipe comments props hooks and
  useDeleteRecipe now live once in the client package, taking the typed client
  as a parameter, with hosts keeping only surface-specific extras (share
  execution, confirmation dialogs, navigation) at the edges. The app's typed
  client export is renamed from `api` to `eciperay`, matching web. No behavior
  change on either platform.
- 506a166: PostHog error reports and log records from the native app now carry
  the app version and build: the app reads them from expo-application at
  analytics creation, registers them as PostHog super properties, and the shared
  analytics layer merges them explicitly into every captureException and log
  call (caller-supplied values win), so error triage can tell current-build
  errors from outdated-app noise.
- 81d315f: Recipe tips UI (#635, tranche 2): the recipe version edit form (web
  and native) gains a repeatable tips editor — add, edit, reorder, and remove
  the version's tips, saved through the normal version save path — and the
  recipe detail now shows the version's tips at the bottom of the overview.
  `RecipeDetail` gains the displayed version's `tips` (the server detail mapping
  now carries the active version's list, and viewing another version overlays
  its tips), so the detail hosts pass them to the design system's
  `cookingTipLabel` line under Start Cooking. @spudly/ui 14 carries only the
  singular label, so multiple tips render as one italic line with each tip's
  "Tip: " lead-in preserved, in array order; a plural DS prop (one line per tip)
  remains a design-system follow-up.
- 8e662cd: Share the core Lingui catalog: the strings both hosts render
  identically now live once in @eciperay/client's core .po catalog, each host's
  catalog keeps only its host-specific strings, and both hosts merge core + host
  catalogs at runtime. No copy changes.
- Updated dependencies [2474422]
- Updated dependencies [5366e11]
- Updated dependencies [8192961]
- Updated dependencies [caf2177]
- Updated dependencies [695ba21]
- Updated dependencies [799cdba]
- Updated dependencies [4c529b9]
- Updated dependencies [4ee9f5e]
- Updated dependencies [f3ffa78]
- Updated dependencies [7ee7ff6]
- Updated dependencies [506a166]
- Updated dependencies [8b6dd07]
- Updated dependencies [3ac1d11]
- Updated dependencies [81d315f]
- Updated dependencies [ed6abf2]
- Updated dependencies [7075f8b]
- Updated dependencies [98e8e7c]
- Updated dependencies [8e662cd]
- Updated dependencies [aa849a6]
- Updated dependencies [caf3abb]
- Updated dependencies [1af3b9b]
- Updated dependencies [c4d3376]
  - @eciperay/client@1.35.0
  - @eciperay/types@1.35.0

## 1.34.4

### Patch Changes

- 22b1b74: Recipe detail, AI session, import, and native auth copy now comes
  from the apps' Lingui catalogs: recipe-detail version, rating, cook-log,
  sharing, and comments strings, the AI generate/tweak plan, preview, and save
  strings, the import failure and image-picker labels, and the native sign-in,
  sign-up, forgot-password, and reset-password confirmation and error alerts
  render in the active locale (including the en-XA pseudo-locale), laying the
  groundwork for translated page copy.
- b1c387e: Meal plan detail goal-progress copy now comes from the apps' Lingui
  catalogs: the below-goal / above-goal / on-track band labels, the at-least /
  up-to goal range qualifiers, the per-day-average and plan-total row
  qualifiers, and the satiety row label render in the active locale (including
  the en-XA pseudo-locale), laying the groundwork for translated page copy. This
  is batch 4 of the #465 copy migration (tranche 17); the remaining batch-4
  tranches follow in the same pull request.

  The meals cluster remainder now flows through the same catalogs (tranche 16):
  the meals hub's entry-count and recipe-count plural subtitles, the meal detail
  servings composition ("Servings to cook / Servings to eat") and condensed
  member nutrition parts, and the meal / meal-plan form load-error messages
  render in the active locale on web and native.

  The recipe form now flows through the same catalogs (tranche 12): the form
  hosts' image crop / preview errors, sign-in and AI-generation errors,
  save-guard and validation messages, the changed-from-parent labels, the image
  empty message, the pending-image and crop dialog copy, the sortable-list
  reorder labels, and the create / edit / edit-version submit labels render in
  the active locale on web and native.

  The profile page now flows through the same catalogs (tranche 18): the
  subscription plan / status / upsell / reconciling copy, the recipe transfer
  hint, picker and account-data copy, the import / export / account error
  fallbacks and import summary, the delete-account confirmation, the
  access-token created / last-used meta labels, and the native author-display
  load error render in the active locale on web and native.

  Review follow-ups in the same batch: the recipe form's changed-from-parent
  summaries are now composed from the catalogs on web and native (the client
  helper supplies the structured counts and preview), the meals hub's nutrition
  suffix uses the localized nutrition labels on both tabs, the native
  missing-image-data error resolves through the catalog, and a `null` import
  file shows the localized validation message instead of a JavaScript error.

- bb690d4: Recipes list: the "Your recipes" section title, the discovery author
  byline, the load and load-more error messages, and the recipe status labels
  (Idea / Evolving / Perfected / Abandoned, shared with the recipe form) now
  flow through the app's Lingui catalogs (en-US and en-XA pseudo-locale) instead
  of hardcoded strings, on web and native.
- dedd73a: Cooking mode: the ingredients heading (including the "scaled to"
  variant) and the cook-log notes placeholder now flow through the app's Lingui
  catalogs (en-US and en-XA pseudo-locale) instead of hardcoded strings, on web
  and native.
- 463d9eb: Home page: the title, subtitle, Browse/Add/Shared-with-me labels,
  recently-viewed section title, and empty message — plus the native
  Shared-with-me screen title — now flow through the apps' Lingui catalogs
  (en-US and en-XA pseudo-locale) instead of hardcoded shared constants. The
  native app gains its first I18nProvider wiring for this copy.
- 7a9b53e: Add menu: the add-recipe menu options' labels and descriptions now
  flow through the app's Lingui catalogs (en-US and en-XA pseudo-locale) instead
  of hardcoded strings, on web and native — each platform keeps its own wording
  where the two differed.
- be3fbe9: Meal plan editor: each selected entry now shows a per-entry Day field
  (@spudly/ui 11.2, design-system #673). Setting an entry's day and saving
  persists it, and the meal plan detail week view groups the entry under that
  day.
- a738d81: Fix the Add tab reopening a completed import's review page: accepting
  an import, starting edits on it, or finishing a manual entry now resets the
  Add stack to its root before switching to the Recipes tab, so tapping Add
  starts a fresh import flow.
- 2a252b0: Adopt @spudly/ui 10.0.0 and supply the Eciperay voice at the app
  root: shared design-system screens and controls now speak in Eciperay's own
  warm, encouraging voice — plain where a label should be plain, and plain in
  errors — on both web and native. The temporary ScreenContainer patch is gone,
  replaced by the design system's durable fix.
- 7c3a765: Fixed the Android release bundle failing to build: the app now
  composes its Lingui .po catalog compilation into Metro through a transformer
  that lives in the app package and delegates to the app's own React Native
  babel transformer, instead of @lingui/metro-transformer — which is hoisted to
  the monorepo root and silently delegated to the root's older React Native
  toolchain, whose parser cannot handle Flow syntax in the app's react-native
  version and failed the bundle on react-native's own sources.
- 526150f: Allow servings-to-cook of 0 for meal members and meal-plan recipe
  entries, so a leftover meal cooks nothing and no longer inflates the shopping
  list. Shopping-list generation skips 0-cook entries, and the editors let 0 be
  entered with servings-to-eat staying positive.
- 6059349: Meal plan entries can carry a calendar day, and the meal plan detail
  views (web and native) now render the week view: one column per day of the
  plan's range with per-day totals computed from servings eaten. Entries without
  a day group under the plan's first day; plans with no dates keep the flat
  entry list.
- d7c664f: Lingui catalogs are now imported directly as .po files and compiled
  on the fly (@lingui/vite-plugin on web, @lingui/metro-transformer on native)
  instead of committing the generated messages.ts files — no user-visible
  change; the same strings ship in both locales, and parallel catalog work no
  longer conflicts in generated files.
- 48b855e: Share a link instead of the recipe: tapping Share on a recipe now
  shares its Eciperay link (with the recipe title) rather than the full recipe
  text, and never links to the source the recipe was imported from. The link
  works even for private recipes — opening it shows the full recipe to a guest
  with a sign-in option, and a signed-in recipient finds the recipe under
  "Shared with me". Private recipes stay private without the link: a guest, or a
  signed-in recipient who does not already hold a share grant, needs a valid
  link to open one. Sharing again never revokes links already sent — only
  rotating the link does, and rotation revokes the old links, not a recipient's
  existing share grant. Returning a recipe to private revokes both its issued
  links and its existing share grants.
- 7bcd56d: The top bar's Meals item now navigates directly to meal plans: on web
  it lands on the Meals hub's Plans tab, and the native Meals hub opens on the
  Plans tab. The Meals tab itself is unchanged — only the landing changed, since
  meal plans are the primary surface.
- Updated dependencies [b1c387e]
- Updated dependencies [bb690d4]
- Updated dependencies [14b44b2]
- Updated dependencies [2a252b0]
- Updated dependencies [b2f49e6]
- Updated dependencies [526150f]
- Updated dependencies [6059349]
- Updated dependencies [48b855e]
  - @eciperay/client@1.34.4
  - @eciperay/types@1.34.4

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
- 233bc5e: Meals can now carry direct ingredients on native and through the MCP
  tools, completing the direct-ingredients feature (#362): the native meal
  detail screen lists a meal's direct ingredients with quantity, servings, and
  servings-scaled nutrition, the native meal form can add, edit, and remove
  direct ingredients and can save a meal built from direct ingredients alone,
  and the MCP `create_meal` / `update_meal` tools accept an `ingredients` list
  (at least one recipe or direct ingredient is required; omitting the list on
  update preserves the stored ingredients).
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
  - @eciperay/client@1.34.3

## 1.34.2

### Patch Changes

- a149e08: Android deep links now open the matching in-app screen (#484): the
  manifest delivers every URL under the app's own scheme to MainActivity
  (previously only the `auth` host was registered, so other links failed with
  "No Activity found to handle Intent"), the navigation linking config lives in
  its own module covering both the production and dev schemes, and in-app URL
  opens go through a helper that swallows a failed open instead of leaking an
  unhandled rejection.
- 717a009: Auth forms now validate the email address before submitting (#461):
  on sign-in, sign-up, and forgot-password (web and native), a malformed email
  shows "Enter a valid email address" under the email field and no auth request
  is made, instead of surfacing the generic invalid-credentials error.
  Well-formed emails behave exactly as before. The forms render through
  @spudly/ui 9.1.0, whose auth pages accept the field-level `emailError` prop
  this validation uses.
- 2e4e169: Saving a recipe without an image now generates one automatically
  (#407): on any save (create or edit, from web, app, or MCP) of a recipe that
  currently has no image, the server generates an image with the existing AI
  generation machinery and attaches it — asynchronously, so the save never waits
  on or fails because of generation, and at most once per recipe. Recipe photos
  can now be replaced but no longer deleted: the Remove image action is gone
  from the web and app recipe forms, so once a recipe has an image it keeps one.
- a88e931: The app's Recipes tab is now the unified browse (#412): your own
  recipes appear first, followed by the recipes shared with you (badged
  "Shared", opening their public permalink, with no log-cook control on shared
  rows), and the public Discover catalog appears below in its own section — all
  under the one search/filter bar, with each section loading more as you scroll
  and showing its own error state if its first page fails. Home's "Shared with
  me" entry and the shared-with-me deep link now land on the Recipes tab, and
  the old standalone Shared with me screen redirects there.
- Updated dependencies [717a009]
- Updated dependencies [8f1506d]
- Updated dependencies [99ef1b0]
  - @eciperay/client@1.34.2
  - @eciperay/types@1.34.2

## 1.34.1

### Patch Changes

- 70f3d1c: Android release build fixed (#466): the release AAB and emulator jobs
  failed evaluating the `:expo` project because expo-constants' Gradle script
  still reads the legacy `libraryVariants` API that AGP 9's new DSL removed (a
  regression from the Expo autolinking wiring in #464). The app now sets AGP's
  documented `android.newDsl=false` compatibility opt-out in
  `gradle.properties`, restoring the previous DSL so the release build
  configures cleanly. With configuration fixed, dependency resolution then
  exposed a second failure: `settings.gradle`'s
  `RepositoriesMode.PREFER_SETTINGS` silently discards the per-package
  `local-maven-repo` directories expo-modules-autolinking registers at project
  level for its AAR-published modules (expo.modules.asset,
  host.exp.exponent:expo.modules.*), so those artifacts could not be found in
  google()/mavenCentral()/jitpack. The settings-level repositories now mirror
  every `local-maven-repo` directory shipped under node_modules — scanning both
  the app and workspace-root node_modules trees, including packages nested
  inside other packages' node_modules, because npm hoisting makes any one
  package's location unstable across installs. With resolution fixed, the
  fixture build then failed `:expo:checkReleaseAarMetadata`: Expo SDK 58's
  AAR-published modules declare `minCompileSdk 37` in their AAR metadata while
  the project compiled against Android 36. The project now compiles against
  Android 37 (`compileSdkVersion 37`, build-tools 37.0.0, and the CI Android
  setup installs the android-37 platform); `targetSdkVersion` stays 36, so
  runtime behavior is unchanged. No user-facing behavior changes.
- 43ff8bc: Recipe image upload now offers optional cropping before the image is
  saved (#406): after choosing or taking a photo, the pending recipe image can
  be cropped with a draggable/resizable crop box (defaulting to the 4:3 recipe
  display ratio), used as-is, or discarded. Confirming the crop replaces the
  pending image with the cropped result before the existing upload path runs;
  cancelling or skipping passes the original photo through unchanged. Cropping
  applies only to the pending recipe image — meal photos and photo import are
  untouched, and no upload API or schema changed.
- c589f52: Public pages adopt @spudly/ui 7.0.0, which retired the
  PublicPageFrame (#452): Discover, the marketing landing, and public recipe
  pages now render their own footer from the shared footer data (the Legal
  column still carries Privacy, Terms, and Do Not Sell or Share), and the brand
  wordmark + Sign in header the frame used to supply is rendered by the host's
  PublicHeader with the same destinations (brand → /, Sign in → /login). No
  public page content or routes changed.
- 697d575: Recipe image cropping now actually crops on native (#453): Expo
  autolinking is wired into the app (use_expo_modules! in the iOS Podfile and
  the expo-autolinking-settings Gradle plugin on Android), so the
  expo-image-manipulator module is registered and applying a crop in the recipe
  form produces the cropped image instead of silently passing the original photo
  through. Web cropping is unchanged. Linking ExpoModulesCore also raises the
  app's minimum iOS version from 15.1 to 16.4 (the pod's deployment-target
  floor).
- 20fdd94: Recipe image upload now offers **Take photo** beside the existing
  browse/choose controls (#405): in the app it opens the camera after the
  existing camera-permission flow, and on web it uses a camera-capture file
  input, so a photo can be snapped in place instead of leaving for the camera
  app first. Captured photos flow through the same upload and preview path as
  picked images.
- @eciperay/client@1.34.1
  - @eciperay/types@1.34.1

## 1.34.0

### Minor Changes

- 43e20fc: Design-system page migrations and the cook-log rework merged since
  v1.33.0: meals, shopping, account, and auth flows now render from @spudly/ui;
  the cook log uses the design-system CookLogForm (star rating and notes) on the
  recipe detail, recipe list, and cooking-mode surfaces; the profile
  feedback-shortcut toggle is restored.

### Patch Changes

- 6f47f34: Web and app icons now render through the design system: both hosts'
  `Icon` components map the app's icon names onto the semantic components from
  `@spudly/ui/icons` (Home, Recipes, Shared, Add, Tags, Profile, Meals, Warning,
  Feedback) instead of `react-icons` (web) and `react-native-vector-icons`
  (app). The `@eciperay/icons` package is removed; the tab-to-icon mapping stays
  app-owned and now lives in `packages/app/src/navigation/tabIcons.ts`. Same
  glyphs, sizes, colors, and accessibility labels — no visible change intended.
- 912dcd2: In the mobile app, an invalid or expired session token during the
  authenticated-session lifecycle now ends in the normal signed-out flow instead
  of surfacing as an unhandled error. A transient authentication-service outage
  no longer signs out a still-valid session (the server answers 503 for a
  transient token lookup failure instead of 401, and the unavailable lookup is
  logged server-side so the outage is visible to operators).
- eca7385: App recipe lists no longer cycle automatic pagination retries after a
  failed next page (#371): on the Recipes and Shared with me screens, a failed
  next-page load now stops automatic loading and shows an error alert under the
  list ("Couldn't load more recipes.") with a "Try again" action that retries
  the failed page manually — mirroring the web hosts' fix in #319.
- 615dd11: The web recipe detail page now renders the design system
  RecipeDetailPage (@spudly/ui) instead of the web app's own tabbed
  implementation (B7 web adoption cluster C7, design-system#130). The new web
  host (pages/RecipeDetailHost) keeps the queries, mutations, and view-model
  mapping web-side, following the native app's host: the sharing controls and
  comments sections slot into the page, the cook-log form is the design system
  RatingForm, and deletion confirmations for the recipe (#263) and for cook log
  entries (#266, wired to the page's onDeleteCookLogPress) run through the
  design system Dialog with failures surfaced in place. Retired: CookHistoryTab,
  NutritionTab, OverviewTab, OverviewActions, RecipeDetailChrome,
  RecipeDetailTabPanel, and VersionPicker; the remaining detail-family files
  (IngredientsTab, InstructionsTab, the engagement chain) stay for the public
  recipe page until cluster C11.

  Both apps bump @spudly/ui to 1.16.0, and the Perfected recipe's create-a-draft
  flow (#264) is restored in both hosts through the page's new
  onCreateDraftPress slot (design-system#357): creating a draft from a Perfected
  recipe opens the new draft in the version editor, as it did before the 1.15.0
  adoption removed the wiring for lack of a slot. The bump also gives
  TextActionCardRow's trailing action its accessible label in the cook history
  list.

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

- 7ca2854: Cooking mode no longer loses a cook log submitted before the recipe
  loads. Opening cooking mode directly (without a version in the URL) on a slow
  connection previously rendered the step controls and the cook log form before
  the recipe arrived, and submitting in that window posted the cook log to an
  empty-version URL, silently losing it. The cooking view (web page and native
  screen) now stays on the loading gate until the recipe has loaded, so the cook
  log form can only be reached with a resolved version.
- 05b2ad4: The cook log form's secondary button is now labeled Skip on every
  surface — recipe detail and recipe list cards on web and in the app — instead
  of Cancel on those surfaces, matching the form's cooking-mode label. Skip
  dismisses the form without creating a cook log entry, as Cancel did.
- 5061f61: A network-level fetch failure during the authenticated session sync
  (e.g. "Failed to fetch" when the API is momentarily unreachable) is now a
  handled failure instead of an unhandled exception: createApiClient surfaces it
  as a typed network error, and the session lifecycle reports it and keeps the
  still-valid session signed in rather than rethrowing it.
- 2d59292: Importing a recipe that already exists in your library (same title
  and same ingredients) now warns you before a second copy is created, on text,
  URL, and image imports in the web app and the mobile app. The warning names
  the existing recipe; choosing to import anyway creates the second copy.
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
- 56b1c54: Tags can now be renamed and recolored in place on the web Tags page
  and the native Tags screen: each tag row gains an Edit action that opens an
  inline form pre-filled with the tag's current name and color, and Save applies
  the change through the tags update endpoint — no more delete-and-recreate to
  fix a tag name (#254).
- ff8c7d4: Both apps now consume @spudly/ui 1.15.0. The bump's design-system
  contract changes are adopted end to end: page navigation renders as real links
  (hrefs on web, deep links in the app) instead of press callbacks; the cook log
  renders the RatingForm; tag colors are chosen from the named color set; the
  shared-with-me list renders the shared RecipesPage. The release also carries
  the design system's accessibility fixes: form field labels are properly
  associated with their inputs on web, the star rating is operable by assistive
  tech, and page and section titles expose a single heading each.
- Updated dependencies [912dcd2]
- Updated dependencies [1bf5611]
- Updated dependencies [f19b8b6]
- Updated dependencies [ed4ff5e]
- Updated dependencies [f36abf3]
- Updated dependencies [5061f61]
- Updated dependencies [b9331c9]
- Updated dependencies [7debb33]
- Updated dependencies [4f3d1b4]
- Updated dependencies [b4b590f]
- Updated dependencies [2d2d424]
  - @eciperay/client@1.34.0
  - @eciperay/types@1.34.0
