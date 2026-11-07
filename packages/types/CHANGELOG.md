# @eciperay/types

## 1.34.1

No changes in this release.

## 1.34.0

### Patch Changes

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

- f19b8b6: Meal and meal-plan writes are now protected against silent
  overwrites: the meal and meal-plan detail responses expose their `updatedAt`
  value as an `ETag`, and `PUT /meals/:id` / `PUT /meal-plans/:id` accept that
  value back — as an `If-Match` header or as an `expectedUpdatedAt` field in the
  request body. When the stored record has changed since the client's read, the
  PUT fails with `409` (`Meal has been modified since it was loaded` /
  `Meal plan has been modified since it was loaded`) and writes nothing, so the
  caller can re-read, re-merge, and retry. Clients that send no token keep the
  previous unconditional full-replace behavior.
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
