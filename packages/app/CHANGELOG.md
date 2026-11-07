# @eciperay/app

## 1.34.1

### Patch Changes

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
