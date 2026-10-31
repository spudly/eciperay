---
'@eciperay/web': patch
'@eciperay/app': patch
---

The web recipe detail page now renders the design system RecipeDetailPage
(@spudly/ui) instead of the web app's own tabbed implementation (B7 web
adoption cluster C7, design-system#130). The new web host
(pages/RecipeDetailHost) keeps the queries, mutations, and view-model mapping
web-side, following the native app's host: the sharing controls and comments
sections slot into the page, the cook-log form is the design system RatingForm,
and deletion confirmations for the recipe (#263) and for cook log entries
(#266, wired to the page's onDeleteCookLogPress) run through the design system
Dialog with failures surfaced in place. Retired: CookHistoryTab, NutritionTab,
OverviewTab, OverviewActions, RecipeDetailChrome, RecipeDetailTabPanel, and
VersionPicker; the remaining detail-family files (IngredientsTab,
InstructionsTab, the engagement chain) stay for the public recipe page until
cluster C11.

Both apps bump @spudly/ui to 1.16.0, and the Perfected recipe's
create-a-draft flow (#264) is restored in both hosts through the page's new
onCreateDraftPress slot (design-system#357): creating a draft from a Perfected
recipe opens the new draft in the version editor, as it did before the 1.15.0
adoption removed the wiring for lack of a slot. The bump also gives
TextActionCardRow's trailing action its accessible label in the cook history
list.
