# @eciperay/server

## 1.34.0

### Patch Changes

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
- cbdc21a: Meal plans with dates set no longer fail to create, update, or open:
  the server now handles the Date objects node-postgres returns for the plan's
  start/end date columns instead of throwing while building the response.
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
