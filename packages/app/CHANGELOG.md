# @eciperay/app

## 1.34.0

### Minor Changes

- 43e20fc: Design-system page migrations and the cook-log rework merged since
  v1.33.0: meals, shopping, account, and auth flows now render from @spudly/ui;
  the cook log uses the design-system CookLogForm (star rating and notes) on the
  recipe detail, recipe list, and cooking-mode surfaces; the profile
  feedback-shortcut toggle is restored.

### Patch Changes

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
- Updated dependencies [ed4ff5e]
- Updated dependencies [b9331c9]
- Updated dependencies [4f3d1b4]
  - @eciperay/types@1.34.0
  - @eciperay/client@1.34.0
  - @eciperay/icons@1.34.0
