import type {ShowcaseDemoRenderer} from '@eciperay/client';

export type ShowcaseModule = Record<string, {demo?: ShowcaseDemoRenderer}>;

export const showcaseModuleLoaders = {
  'Icon': () => import('../Icon.js'),
  'InlineLoadingIndicator': () => import('../InlineLoadingIndicator.js'),
  'LegalLinks': () => import('../LegalLinks.js'),
  'ProfileFeedbackPreference': () => import('../ProfileFeedbackPreference.js'),
  'RecipeListCard': () => import('../RecipeListCard.js'),
  'ScreenLoadingGate': () => import('../ScreenLoadingGate.js'),
  'SharedRecipeListCard': () => import('../SharedRecipeListCard.js'),
  'recipes/RecipeListFiltersBar': () =>
    import('../recipes/RecipeListFiltersBar.js'),
  'recipes/RecipesListView': () => import('../recipes/RecipesListView.js'),
  'shared/SharedWithMeView': () => import('../shared/SharedWithMeView.js'),
  'ui/AuthScreenLayout': () => import('../ui/AuthScreenLayout.js'),
  'ui/BulkSelectToolbar': () => import('../ui/BulkSelectToolbar.js'),
  'ui/BookLoadingSpinner': () => import('../ui/BookLoadingSpinner.js'),
  'ui/CheckboxField': () => import('../ui/CheckboxField.js'),
  'ui/CheckboxSelectList': () => import('../ui/CheckboxSelectList.js'),
  'ui/ColorPickerField': () => import('../ui/ColorPickerField.js'),
  'ui/DestructiveButton': () => import('../ui/DestructiveButton.js'),
  'ui/EmptyMessage': () => import('../ui/EmptyMessage.js'),
  'ui/ErrorText': () => import('../ui/ErrorText.js'),
  'ui/FixedActionBanner': () => import('../ui/FixedActionBanner.js'),
  'ui/FormScreenLayout': () => import('../ui/FormScreenLayout.js'),
  'ui/InfoBanner': () => import('../ui/InfoBanner.js'),
  'ui/ListLoadingFooter': () => import('../ui/ListLoadingFooter.js'),
  'ui/MultilineField': () => import('../ui/MultilineField.js'),
  'ui/NumberStepper': () => import('../ui/NumberStepper.js'),
  'ui/OptionCard': () => import('../ui/OptionCard.js'),
  'ui/PageTitle': () => import('../ui/PageTitle.js'),
  'ui/PrevNextNav': () => import('../ui/PrevNextNav.js'),
  'ui/PrimaryButton': () => import('../ui/PrimaryButton.js'),
  'ui/ProgressDots': () => import('../ui/ProgressDots.js'),
  'ui/RadioOptionGroup': () => import('../ui/RadioOptionGroup.js'),
  'ui/ScreenContainer': () => import('../ui/ScreenContainer.js'),
  'ui/ScreenScroll': () => import('../ui/ScreenScroll.js'),
  'ui/SearchField': () => import('../ui/SearchField.js'),
  'ui/SecondaryButton': () => import('../ui/SecondaryButton.js'),
  'ui/SectionCard': () => import('../ui/SectionCard.js'),
  'ui/SelectField': () => import('../ui/SelectField.js'),
  'ui/StarRatingInput': () => import('../ui/StarRatingInput.js'),
  'ui/StatBadge': () => import('../ui/StatBadge.js'),
  'ui/StatusBadge': () => import('../ui/StatusBadge.js'),
  'ui/TabBar': () => import('../ui/TabBar.js'),
  'ui/TagPill': () => import('../ui/TagPill.js'),
  'ui/TextField': () => import('../ui/TextField.js'),
  'ui/TextLinkButton': () => import('../ui/TextLinkButton.js'),
  'ui/ThumbnailListCard': () => import('../ui/ThumbnailListCard.js'),
  'ui/ToggleChipGroup': () => import('../ui/ToggleChipGroup.js'),
  'cooking/CookLogForm': () => import('../cooking/CookLogForm.js'),
  'meals/MealPlanDetailView': () => import('../meals/MealPlanDetailView.js'),
  'meals/NutritionGoalProgressView': () =>
    import('../meals/NutritionGoalProgressView.js'),
  'recipe/CookHistoryTab': () => import('../recipe/CookHistoryTab.js'),
  'recipe/IngredientsTab': () => import('../recipe/IngredientsTab.js'),
  'recipe/InstructionsTab': () => import('../recipe/InstructionsTab.js'),
  'recipe/NutritionTab': () => import('../recipe/NutritionTab.js'),
  'recipe/OverviewActions': () => import('../recipe/OverviewActions.js'),
  'recipe/OverviewTab': () => import('../recipe/OverviewTab.js'),
  'recipe/RecipeCommentItem': () => import('../recipe/RecipeCommentItem.js'),
  'recipe/RecipeCommentsSection': () =>
    import('../recipe/RecipeCommentsSection.js'),
  'recipe/RecipeDetailChrome': () => import('../recipe/RecipeDetailChrome.js'),
  'recipe/RecipeDetailTabPanel': () =>
    import('../recipe/RecipeDetailTabPanel.js'),
  // Page-view migration (#49): the app side has a 'recipe/RecipeDetailView'
  // host for the design system's RecipeDetailPage (@spudly/ui/pages),
  // which owns the detail tab queries, mutations, and slots on native.
  // The host is app-only (registered as such in the UI parity registry),
  // so — like the other platform-only components — it is in neither
  // platform's showcase loaders or catalog: web renders its own DOM
  // recipe detail page, and there is deliberately no web mirror file.
  'recipe/RecipeEngagementPanel': () =>
    import('../recipe/RecipeEngagementPanel.js'),
  'recipe/RecipeImageField': () => import('../recipe/RecipeImageField.js'),
  'recipe/RecipeInputPreview': () => import('../recipe/RecipeInputPreview.js'),
  'recipe/RecipeRatingsSection': () =>
    import('../recipe/RecipeRatingsSection.js'),
  'recipe/RecipeStatusBadge': () => import('../recipe/RecipeStatusBadge.js'),
  'recipe/RecipeVisibilityControls': () =>
    import('../recipe/RecipeVisibilityControls.js'),
  'recipe/ScaleMultiplierButtons': () =>
    import('../recipe/ScaleMultiplierButtons.js'),
  'recipe/ServingsStepper': () => import('../recipe/ServingsStepper.js'),
  'recipe/SortableIngredientList': () =>
    import('../recipe/SortableIngredientList.js'),
  'recipe/SortableInstructionList': () =>
    import('../recipe/SortableInstructionList.js'),
  'recipe/StaleVersionHint': () => import('../recipe/StaleVersionHint.js'),
  'recipe/VersionPicker': () => import('../recipe/VersionPicker.js'),
} as Record<string, () => Promise<ShowcaseModule>>;
