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
