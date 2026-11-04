---
'@eciperay/web': patch
---

B7 orphan sweep (design-system#130): eleven web components left behind by the B7
cluster retirements are removed — the tab-era recipe-detail files
(IngredientsTab, InstructionsTab, RecipeEngagementPanel, RecipeRatingsSection,
RecipeStatusBadge, ScaleMultiplierButtons, ServingsStepper), the recipes-list
filter components (RecipeListFiltersBar, RecipeListNumberFilter,
RecipeListStatusIngredientFilters), and the ui TabBar adapter — together with
their tests and their UI-parity registry entries. Each had zero importers left
on master: their consumers retired as the recipe detail (C7), recipes list (C5),
and public surfaces (C11) adopted the design-system pages. Dead code only — no
behavior changes.
