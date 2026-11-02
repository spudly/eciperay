---
'@eciperay/client': patch
'@eciperay/server': patch
'@eciperay/web': patch
'@eciperay/app': patch
---

Meal and meal-plan recipe pickers are now a search autocomplete (#359),
replacing the checkbox list of library options: type in the picker's search
field and matching recipes are searched server-side and offered as results —
select one to add it, and repeat to add more; selected recipes are listed
separately under the search field, each with a Remove action and its servings
stepper (meal plans: quantity steppers for meals and recipes, plus servings for
recipes), and the steppers keep working for a selection that is not in the
current search results. This removes the old picker's cap — it only ever offered
the first 100 recipes in an account, so older recipes beyond that (for example
in a large account) could not be added to a Meal or meal plan; now any recipe is
reachable by searching for it, in the meal form and the meal-plan form on web
and in the app (@spudly/ui 2.0.0's MealFormPage / MealPlanFormPage autocomplete
contract). The server's recipe list ordering is now total: every sort branch
ends with a unique version-id tie-breaker (and the shared-with-me newest order
with the recipe id), so recipes that tie on the sort keys cannot be skipped or
duplicated across page boundaries and search results have a deterministic order.
If a picker search fails, the meal and meal-plan forms show a "Could not load
recipes" error instead of reading as no matches.
