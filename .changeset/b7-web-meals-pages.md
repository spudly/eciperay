---
'@eciperay/web': patch
---

The web meals surfaces now render the design system pages (@spudly/ui) instead
of the web app's own views (B7 web adoption, design-system#130): the meals hub
(MealsHubPage), meal detail (MealDetailPage), meal and meal plan forms
(MealFormPage, MealPlanFormPage), meal plan detail (MealPlanDetailPage),
shopping list (ShoppingListPage), and meal cooking mode (MealCookingModePage).
Navigation crosses to the pages as hrefs; the meal plan detail's nutrition-goal
rows now carry the app's "(per-day avg)" / "(plan total)" label qualifiers
instead of the old web-only caption paragraph.
