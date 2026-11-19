# @eciperay/mcp-server

## 1.34.4

### Patch Changes

- 2a252b0: Adopt @spudly/ui 10.0.0 and supply the Eciperay voice at the app
  root: shared design-system screens and controls now speak in Eciperay's own
  warm, encouraging voice — plain where a label should be plain, and plain in
  errors — on both web and native. The temporary ScreenContainer patch is gone,
  replaced by the design system's durable fix.
- b2f49e6: Allow servings-to-eat of 0 and fractional servings (such as 0.5 or
  1.5) for meal members, direct ingredients, and meal-plan recipe entries, so an
  entry someone eats none of — or only part of a serving of — no longer has to
  be entered as a whole serving. Nutrition now scales by the exact amount eaten:
  an entry set to eat 0 contributes nothing, and eating half a serving
  contributes half.
- 526150f: Allow servings-to-cook of 0 for meal members and meal-plan recipe
  entries, so a leftover meal cooks nothing and no longer inflates the shopping
  list. Shopping-list generation skips 0-cook entries, and the editors let 0 be
  entered with servings-to-eat staying positive.
- 6059349: Meal plan entries can carry a calendar day, and the meal plan detail
  views (web and native) now render the week view: one column per day of the
  plan's range with per-day totals computed from servings eaten. Entries without
  a day group under the plan's first day; plans with no dates keep the flat
  entry list.

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

## 1.34.2

No changes in this release.

## 1.34.1

### Patch Changes

- 6c51c21: MCP `update_recipe` can now edit recipe ingredients and instructions
  (#410): pass `versionId` (from `get_recipe`) naming the version to edit, and
  the change is applied atomically — an editable draft version is edited in
  place, while naming the active version branches a new version from it and
  leaves the original untouched in history. Metadata fields in the same call
  land on the same version. The edited version stays a draft by default; pass
  `activate: true` to make it active. Metadata-only updates behave exactly as
  before.

## 1.34.0

### Patch Changes

- bdb63f2: The MCP server can now write meals and meal plans, not just read
  them: create, update, and delete meals and meal plans; add and remove recipes
  in a meal with per-recipe servings; and add, remove, and reorder meal plan
  entries (meals or standalone recipes) with per-entry quantities. New
  list_meals and get_meal read tools round out the meal surface, so a full meal
  plan can be built and maintained end-to-end through MCP.
