import type {ShowcaseDemoRenderer} from '@eciperay/client';

export type ShowcaseModule = Record<string, {demo?: ShowcaseDemoRenderer}>;

export const showcaseModuleLoaders = {
  'Icon': () => import('../Icon'),
  'InlineLoadingIndicator': () => import('../InlineLoadingIndicator'),
  'LegalLinks': () => import('../LegalLinks'),
  'ProfileFeedbackPreference': () => import('../ProfileFeedbackPreference'),
  'RecipeListCard': () => import('../RecipeListCard'),
  'ScreenLoadingGate': () => import('../ScreenLoadingGate'),
  'SharedRecipeListCard': () => import('../SharedRecipeListCard'),
  'recipes/RecipesListView': () => import('../recipes/RecipesListView'),
  'shared/SharedWithMeView': () => import('../shared/SharedWithMeView'),
  'ui/BookLoadingSpinner': () => import('../ui/BookLoadingSpinner'),
  'ui/CheckboxField': () => import('../ui/CheckboxField'),
  'ui/ColorPickerField': () => import('../ui/ColorPickerField'),
  'ui/EmptyMessage': () => import('../ui/EmptyMessage'),
  'ui/InfoBanner': () => import('../ui/InfoBanner'),
  'ui/PageTitle': () => import('../ui/PageTitle'),
  'ui/PrevNextNav': () => import('../ui/PrevNextNav'),
  'ui/PrimaryButton': () => import('../ui/PrimaryButton'),
  'ui/ProgressDots': () => import('../ui/ProgressDots'),
  'ui/RadioOptionGroup': () => import('../ui/RadioOptionGroup'),
  'ui/ScreenScroll': () => import('../ui/ScreenScroll'),
  'ui/SearchField': () => import('../ui/SearchField'),
  'ui/SecondaryButton': () => import('../ui/SecondaryButton'),
  'ui/SectionCard': () => import('../ui/SectionCard'),
  'ui/SelectField': () => import('../ui/SelectField'),
  'ui/StarRatingInput': () => import('../ui/StarRatingInput'),
  'ui/ThumbnailListCard': () => import('../ui/ThumbnailListCard'),
  'cooking/CookLogForm': () => import('../cooking/CookLogForm'),
  'meals/MealPlanDetailView': () => import('../meals/MealPlanDetailView'),
  'recipe/RecipeCommentItem': () => import('../recipe/RecipeCommentItem'),
  'recipe/RecipeCommentsSection': () =>
    import('../recipe/RecipeCommentsSection'),
  // Page-view migration (#49): there is deliberately no loader entry for
  // 'recipe/RecipeDetailView' — the app-side host for the design system's
  // RecipeDetailPage (@spudly/ui/pages). The host is app-only (registered
  // as such in the UI parity registry), and platform-only components are
  // in neither platform's showcase loaders or catalog.
  'recipe/RecipeImageField': () => import('../recipe/RecipeImageField'),
  'recipe/RecipeInputPreview': () => import('../recipe/RecipeInputPreview'),
  'recipe/RecipeVisibilityControls': () =>
    import('../recipe/RecipeVisibilityControls'),
  'recipe/SortableIngredientList': () =>
    import('../recipe/SortableIngredientList'),
  'recipe/SortableInstructionList': () =>
    import('../recipe/SortableInstructionList'),
  'recipe/StaleVersionHint': () => import('../recipe/StaleVersionHint'),
} as Partial<Record<string, () => Promise<ShowcaseModule>>> as Record<
  string,
  () => Promise<ShowcaseModule>
>;
