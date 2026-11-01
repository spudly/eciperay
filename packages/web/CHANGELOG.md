# @eciperay/web

## 1.34.0

### Patch Changes

- 648fd00: Web AI sessions (#295): an in-progress "Generate with AI" or "Tweak
  with AI" session is no longer lost when navigating away and back. The web
  session host persists the active session's id in localStorage (per flow, and
  per recipe for tweaks), re-fetches the session from the server on return, and
  restores the prompt conversation and generated plan; stored ids are cleared
  when the session is cancelled, finalized, already finished, or no longer
  resolves.
- 94331a4: The web Add & create flows now render the design system pages
  (@spudly/ui) instead of the web app's own views — B7 cluster C4
  (design-system#130): the add-recipe menu renders AddRecipeMenuPage, the four
  import steps render ImportTextPage / ImportUrlPage / ImportImagePage /
  ImportReviewPage, and both AI routes render AiSessionPage through a web
  session host that keeps the state machine and mutations web-side. Two visible
  deltas come with the design system contracts the native app already ships:
  text import pastes into a plain text field instead of a rich-text editor, and
  image import offers the app's Take Photo / Choose from Library actions (both
  open a file picker on the web; Take Photo asks mobile browsers for the
  camera).
- 31ae6e2: The web auth pages (sign in, sign up, forgot password, reset
  password) now render the design system auth pages (@spudly/ui SignInPage,
  SignUpPage, ForgotPasswordPage, ResetPasswordPage) instead of the web app's
  own views — B7 cluster C3 of the web adoption (design-system#130). The web
  hosts keep routing, session handling, and the post-submit confirmation states;
  the sign-up page keeps the web legal-links notice in the design system page's
  legal slot. Field labels and button copy follow the design system pages ("Your
  name", "Create Account", "Send Reset Link"), matching the native app.
- 40a23a0: The web Home page now renders the design system HomePage (@spudly/ui)
  instead of the web app's own view (B7 web adoption, design-system#130). The
  recently-viewed recipe cards keep their in-page delete confirmation and error,
  and their Log cook form is now the design system CookLogForm the native app
  already uses — its notes field is labeled "Notes from this cook (optional)"
  and its save button reads "Save".
- d62f9f6: The web meals surfaces now render the design system pages
  (@spudly/ui) instead of the web app's own views (B7 web adoption,
  design-system#130): the meals hub (MealsHubPage), meal detail
  (MealDetailPage), meal and meal plan forms (MealFormPage, MealPlanFormPage),
  meal plan detail (MealPlanDetailPage), shopping list (ShoppingListPage), and
  meal cooking mode (MealCookingModePage). Navigation crosses to the pages as
  hrefs; the meal plan detail's nutrition-goal rows now carry the app's
  "(per-day avg)" / "(plan total)" label qualifiers instead of the old web-only
  caption paragraph.
- c55f3d5: The web profile and feedback surfaces now render the design system
  pages (@spudly/ui ProfilePage, FeedbackPage, AccessTokensPanel,
  NutritionGoalsForm) instead of the web app's own views — B7 cluster C10 of the
  web adoption (design-system#130). The web hosts keep the session, queries,
  mutations, and the feedback shortcut's analytics-consent flow (show and
  re-present consent, eciperay#256/#299); the feedback form lives in the bubble
  overlay as the DS FeedbackPage. Subscription, transfer, and account-data
  sections remain as ProfilePage slot content rebuilt on design system widgets,
  the pay page converts to direct design system imports, and the retired web
  views (ProfileView, AccessTokensView, AccessTokensTokenRow,
  NutritionGoalsFormView) and the DestructiveButton/ScreenContainer adapters are
  removed.
- 140b4ba: The web public surfaces now render the design system's public pages
  instead of the web app's own implementations (B7 web adoption,
  design-system#130): Discover renders DiscoverPage — filters start collapsed
  behind the page's "Add a filter" chooser, more recipes load when the list is
  scrolled to the end, and a failed first load now shows an error message
  instead of spinning forever; the public recipe page renders PublicRecipePage
  as a single scroll (no tabs) with its sign-up / clone / get-the-app actions;
  the privacy policy and terms of service render LegalDocumentPage from
  structured content data inside the full public frame (footer included); and
  the signed-out landing renders LandingPage. All four surfaces share the design
  system's PublicPageFrame chrome.
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

- ff8c7d4: The web recipe form pages (manual entry, edit recipe, edit version)
  now render the design system RecipeFormPage and its EditRecipePage /
  ManualEntryPage / EditVersionPage shells (@spudly/ui) instead of the web app's
  own form and shell implementations (B7 web adoption cluster C8,
  design-system#130). The web host keeps the form state, tags query, image
  upload/generation, and parent-version diffing; the image field and the
  drag-to-sort ingredient/instruction lists stay web-side as the pages' slot
  implementations, as in the native app. Form copy follows the design system
  pages the app already ships.
- 1d9d2b7: The web component showcase is retired (B7 cluster C2,
  design-system#130): the dev-only `/dev/components` route, the showcase page
  and its picker/demo components, and the `@eciperay/client` showcase catalog
  and demo types are removed, along with the profile screen's Component Showcase
  entry point. The design system Storybooks are the component showcase now. No
  production behavior changes — the showcase route only ever existed in
  development builds.
- 8488a19: The web Tags page now renders the design system TagsPage (@spudly/ui
  1.13.0) instead of the web app's own view — the first page adoption of B7 web
  adoption (design-system#130). Tag colors are picked from the same swatch
  palette the native app offers instead of a free-form color input.
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
- 7afbd70: Feedback bubble panel: lay the feedback form out as a full-height
  column so the host-rendered "Cancel" action is fully visible without
  scrolling. The design-system FeedbackPage's scroll container claims the
  panel's full height (min-height: 100%), which pushed Cancel a full
  button-height below the panel's bottom edge — it rendered partially clipped on
  tall viewports and needed a scroll to reveal. The form now reserves Cancel's
  space in the column: on tall viewports both "Submit feedback" and "Cancel" are
  fully visible when the panel opens, and on short viewports the form scrolls
  internally while Cancel stays visible and the "Feedback" heading remains in
  view.
- c233540: Feedback bubble panel: give the open panel a definite height (the
  form's natural height, capped by the viewport allowance) instead of only a
  max-height. The design-system FeedbackPage's scroll container collapsed to a
  short sliver with a clipped "Feedback" heading inside the previously
  shrink-to-fit panel; the panel now renders at full form height on tall
  viewports and still shrinks and scrolls on short ones.
- f7cfeee: Feedback bubble panel (#316): the floating feedback panel is now
  constrained to the viewport height and scrolls internally, so on short
  viewports (e.g. 320×568) or at 200% zoom every field and both actions (Cancel
  and Submit feedback) stay reachable instead of the top of the form being cut
  off.
- 8d3a8e5: Web feedback shortcut (#256): the Profile feedback preference now
  shows the current analytics consent state (Accepted / Declined / Not set) with
  an action to change it in place, instead of help text pointing at a consent
  banner the user might never see. Turning the shortcut on always re-presents
  the consent prompt — Accept keeps the shortcut on (the floating Feedback
  button appears), Decline shows an error and forces the preference back off, so
  the preference can no longer be on with no visible effect.
- 2d59292: Importing a recipe that already exists in your library (same title
  and same ingredients) now warns you before a second copy is created, on text,
  URL, and image imports in the web app and the mobile app. The warning names
  the existing recipe; choosing to import anyway creates the second copy.
- 23e2823: Meal detail page: show the "Page not found" state for a nonexistent
  or deleted meal and the generic "Something went wrong" state for other load
  failures (including a failed refetch over a cached meal), instead of hanging
  on the loading skeleton indefinitely.
- b06b319: A meal plan detail link for a deleted or non-existent plan now shows
  a "Page not found" message instead of staying on the loading skeleton forever,
  and the meal plan create/edit form shows a loading spinner in the Meals &
  recipes list while meals and recipes load instead of briefly claiming "No
  items found."
- baf076f: The meal plan detail page now shows the saved values immediately
  after editing a plan (dates, entries, and totals) instead of showing the
  pre-edit plan until the page is reloaded.
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
- 3cbd7d3: QA polish (#278): recipe cards for 1-serving recipes now read "1
  serving" instead of "1 servings" — the card subtitle (servings, cook time,
  rating, satiety) is formatted by one shared helper in @eciperay/client for the
  web and app list cards, the app's recipes and shared-with-me hosts, and the
  cooking-mode scaled-ingredients label. A recipe whose nutrition is still being
  computed now shows "Satiety pending" on its card instead of "Satiety…", which
  read as a truncated value. The recipe detail Overview no longer repeats the
  recipe status under the title: the status pill in the detail chrome's toolbar
  is the single display, matching the design system's RecipeDetailPage, which
  takes status as a page-level prop and keeps it out of the overview.
- ea4c016: Recipe cards on Home and the recipe list now render their "Log cook"
  and "Delete" action buttons inside the card border, next to the recipe title,
  instead of floating outside the card in the right margin.
- abc8bce: Recipe deletion on web works again: the recipe list and Home card
  Delete buttons no longer gate on `window.confirm` (suppressed dialogs made
  Delete a silent no-op) — they confirm in-page with Confirm delete / Cancel, a
  failed delete now shows an error and keeps the recipe listed, and the recipe
  detail page gains the Delete control it was missing, returning to the list
  after a successful delete.
- 8cc6ca9: A recipe detail link for a deleted or non-existent recipe now shows a
  "Page not found" message instead of staying on the loading placeholder
  forever. A 404 for the recipe also wins over a cached copy, and deleting a
  recipe drops its cached detail entry so its old detail URL cannot render the
  stale recipe.
- f87f270: Shopping list check-off persistence (#323): on the web, checked-off
  shopping list items now persist across a page reload or navigating away and
  back (previously every reload reset all checks). The checked line keys are
  stored in localStorage keyed by user and meal plan (the app's established
  pattern for this kind of per-user UI state — there is no server-side checked
  field; the list itself is derived from the plan), checks for lines that have
  left the list are pruned when the list loads, and checked items keep their
  existing visually distinct treatment from the design-system page.
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
