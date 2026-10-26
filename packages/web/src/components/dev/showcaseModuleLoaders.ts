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
  'recipes/RecipesListView': () => import('../recipes/RecipesListView.js'),
  'shared/SharedWithMeView': () => import('../shared/SharedWithMeView.js'),
  'ui/BookLoadingSpinner': () => import('../ui/BookLoadingSpinner.js'),
  'ui/CheckboxField': () => import('../ui/CheckboxField.js'),
  'ui/ColorPickerField': () => import('../ui/ColorPickerField.js'),
  'ui/EmptyMessage': () => import('../ui/EmptyMessage.js'),
  'ui/InfoBanner': () => import('../ui/InfoBanner.js'),
  'ui/PageTitle': () => import('../ui/PageTitle.js'),
  'ui/PrevNextNav': () => import('../ui/PrevNextNav.js'),
  'ui/PrimaryButton': () => import('../ui/PrimaryButton.js'),
  'ui/ProgressDots': () => import('../ui/ProgressDots.js'),
  'ui/RadioOptionGroup': () => import('../ui/RadioOptionGroup.js'),
  'ui/ScreenScroll': () => import('../ui/ScreenScroll.js'),
  'ui/SearchField': () => import('../ui/SearchField.js'),
  'ui/SecondaryButton': () => import('../ui/SecondaryButton.js'),
  'ui/SectionCard': () => import('../ui/SectionCard.js'),
  'ui/SelectField': () => import('../ui/SelectField.js'),
  'ui/StarRatingInput': () => import('../ui/StarRatingInput.js'),
  'ui/ThumbnailListCard': () => import('../ui/ThumbnailListCard.js'),
  'cooking/CookLogForm': () => import('../cooking/CookLogForm.js'),
  'meals/MealPlanDetailView': () => import('../meals/MealPlanDetailView.js'),
  'recipe/RecipeCommentItem': () => import('../recipe/RecipeCommentItem.js'),
  'recipe/RecipeCommentsSection': () =>
    import('../recipe/RecipeCommentsSection.js'),
  // Page-view migration (#49): the app side has a 'recipe/RecipeDetailView'
  // host for the design system's RecipeDetailPage (@spudly/ui/pages),
  // which owns the detail tab queries, mutations, and slots on native.
  // The host is app-only (registered as such in the UI parity registry),
  // so — like the other platform-only components — it is in neither
  // platform's showcase loaders or catalog: web renders its own DOM
  // recipe detail page, and there is deliberately no web mirror file.
  'recipe/RecipeImageField': () => import('../recipe/RecipeImageField.js'),
  'recipe/RecipeInputPreview': () => import('../recipe/RecipeInputPreview.js'),
  'recipe/RecipeVisibilityControls': () =>
    import('../recipe/RecipeVisibilityControls.js'),
  'recipe/SortableIngredientList': () =>
    import('../recipe/SortableIngredientList.js'),
  'recipe/SortableInstructionList': () =>
    import('../recipe/SortableInstructionList.js'),
  'recipe/StaleVersionHint': () => import('../recipe/StaleVersionHint.js'),
} as Record<string, () => Promise<ShowcaseModule>>;
