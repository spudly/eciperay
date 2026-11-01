---
'@eciperay/client': patch
'@eciperay/web': patch
'@eciperay/app': patch
---

Meal and meal-plan recipe pickers now offer the full recipe library (#359): the
shared form-options query previously made a single list request capped at 100
recipes, so any recipe beyond the first 100 (for example older recipes in a
large account) could not be selected into a Meal or meal plan. The query now
fetches the library in sequential 100-recipe pages until a partial page ends it,
so every recipe is selectable in the meal form and the meal-plan form on web and
in the app.
