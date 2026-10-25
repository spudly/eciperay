import type {ShowcaseDemoRenderer} from '@eciperay/client';

export type ShowcaseModule = Record<string, {demo?: ShowcaseDemoRenderer}>;

export const showcaseModuleLoaders = {
  'FeedbackForm': () => import('../FeedbackForm'),
  'Icon': () => import('../Icon'),
  'InlineLoadingIndicator': () => import('../InlineLoadingIndicator'),
  'LegalLinks': () => import('../LegalLinks'),
  'ProfileFeedbackPreference': () => import('../ProfileFeedbackPreference'),
  'RecipeListCard': () => import('../RecipeListCard'),
  'ScreenLoadingGate': () => import('../ScreenLoadingGate'),
  'SharedRecipeListCard': () => import('../SharedRecipeListCard'),
  'add/AddRecipeMenuView': () => import('../add/AddRecipeMenuView'),
  'auth/SignInView': () => import('../auth/SignInView'),
  'auth/SignUpView': () => import('../auth/SignUpView'),
  'auth/ForgotPasswordView': () => import('../auth/ForgotPasswordView'),
  'auth/ResetPasswordView': () => import('../auth/ResetPasswordView'),
  'home/HomeView': () => import('../home/HomeView'),
  'profile/AccessTokensTokenRow': () =>
    import('../profile/AccessTokensTokenRow'),
  'profile/AccessTokensView': () => import('../profile/AccessTokensView'),
  'profile/ProfileView': () => import('../profile/ProfileView'),
  'recipes/RecipeListFiltersBar': () =>
    import('../recipes/RecipeListFiltersBar'),
  'recipes/RecipesListView': () => import('../recipes/RecipesListView'),
  'shared/SharedWithMeView': () => import('../shared/SharedWithMeView'),
  'tags/TagsView': () => import('../tags/TagsView'),
  'ui/AuthScreenLayout': () => import('../ui/AuthScreenLayout'),
  'ui/BulkSelectToolbar': () => import('../ui/BulkSelectToolbar'),
  'ui/BookLoadingSpinner': () => import('../ui/BookLoadingSpinner'),
  'ui/CheckboxField': () => import('../ui/CheckboxField'),
  'ui/CheckboxSelectList': () => import('../ui/CheckboxSelectList'),
  'ui/ColorPickerField': () => import('../ui/ColorPickerField'),
  'ui/DestructiveButton': () => import('../ui/DestructiveButton'),
  'ui/EmptyMessage': () => import('../ui/EmptyMessage'),
  'ui/ErrorText': () => import('../ui/ErrorText'),
  'ui/FixedActionBanner': () => import('../ui/FixedActionBanner'),
  'ui/FormScreenLayout': () => import('../ui/FormScreenLayout'),
  'ui/InfoBanner': () => import('../ui/InfoBanner'),
  'ui/ListLoadingFooter': () => import('../ui/ListLoadingFooter'),
  'ui/MultilineField': () => import('../ui/MultilineField'),
  'ui/NumberStepper': () => import('../ui/NumberStepper'),
  'ui/OptionCard': () => import('../ui/OptionCard'),
  'ui/PageTitle': () => import('../ui/PageTitle'),
  'ui/PrevNextNav': () => import('../ui/PrevNextNav'),
  'ui/PrimaryButton': () => import('../ui/PrimaryButton'),
  'ui/ProgressDots': () => import('../ui/ProgressDots'),
  'ui/RadioOptionGroup': () => import('../ui/RadioOptionGroup'),
  'ui/ScreenContainer': () => import('../ui/ScreenContainer'),
  'ui/ScreenScroll': () => import('../ui/ScreenScroll'),
  'ui/SearchField': () => import('../ui/SearchField'),
  'ui/SecondaryButton': () => import('../ui/SecondaryButton'),
  'ui/SectionCard': () => import('../ui/SectionCard'),
  'ui/SelectField': () => import('../ui/SelectField'),
  'ui/StarRatingInput': () => import('../ui/StarRatingInput'),
  'ui/StatBadge': () => import('../ui/StatBadge'),
  'ui/StatusBadge': () => import('../ui/StatusBadge'),
  'ui/TabBar': () => import('../ui/TabBar'),
  'ui/TagPill': () => import('../ui/TagPill'),
  'ui/TextField': () => import('../ui/TextField'),
  'ui/TextLinkButton': () => import('../ui/TextLinkButton'),
  'ui/ThumbnailListCard': () => import('../ui/ThumbnailListCard'),
  'ui/ToggleChipGroup': () => import('../ui/ToggleChipGroup'),
  'ai/AiSessionFlow': () => import('../ai/AiSessionFlow'),
  'cooking/CookLogForm': () => import('../cooking/CookLogForm'),
  'feedback/FeedbackView': () => import('../feedback/FeedbackView'),
  'import/ImportImageView': () => import('../import/ImportImageView'),
  'import/ImportReviewView': () => import('../import/ImportReviewView'),
  'import/ImportTextView': () => import('../import/ImportTextView'),
  'import/ImportUrlView': () => import('../import/ImportUrlView'),
  'meals/MealPlanDetailView': () => import('../meals/MealPlanDetailView'),
  'meals/NutritionGoalProgressView': () =>
    import('../meals/NutritionGoalProgressView'),
  'profile/NutritionGoalsFormView': () =>
    import('../profile/NutritionGoalsFormView'),
  'recipe/CookHistoryTab': () => import('../recipe/CookHistoryTab'),
  'recipe/IngredientsTab': () => import('../recipe/IngredientsTab'),
  'recipe/InstructionsTab': () => import('../recipe/InstructionsTab'),
  'recipe/NutritionTab': () => import('../recipe/NutritionTab'),
  'recipe/OverviewActions': () => import('../recipe/OverviewActions'),
  'recipe/OverviewTab': () => import('../recipe/OverviewTab'),
  'recipe/RecipeCommentItem': () => import('../recipe/RecipeCommentItem'),
  'recipe/RecipeCommentsSection': () =>
    import('../recipe/RecipeCommentsSection'),
  'recipe/RecipeDetailChrome': () => import('../recipe/RecipeDetailChrome'),
  'recipe/RecipeDetailTabPanel': () => import('../recipe/RecipeDetailTabPanel'),
  // Page-view migration (#49): there is deliberately no loader entry for
  // 'recipe/RecipeDetailView' — the app-side host for the design system's
  // RecipeDetailPage (@spudly/ui/pages). The host is app-only (registered
  // as such in the UI parity registry), and platform-only components are
  // in neither platform's showcase loaders or catalog.
  'recipe/RecipeEngagementPanel': () =>
    import('../recipe/RecipeEngagementPanel'),
  'recipe/RecipeImageField': () => import('../recipe/RecipeImageField'),
  'recipe/RecipeInputPreview': () => import('../recipe/RecipeInputPreview'),
  'recipe/RecipeRatingsSection': () => import('../recipe/RecipeRatingsSection'),
  'recipe/RecipeStatusBadge': () => import('../recipe/RecipeStatusBadge'),
  'recipe/RecipeVisibilityControls': () =>
    import('../recipe/RecipeVisibilityControls'),
  'recipe/ScaleMultiplierButtons': () =>
    import('../recipe/ScaleMultiplierButtons'),
  'recipe/ServingsStepper': () => import('../recipe/ServingsStepper'),
  'recipe/SortableIngredientList': () =>
    import('../recipe/SortableIngredientList'),
  'recipe/SortableInstructionList': () =>
    import('../recipe/SortableInstructionList'),
  'recipe/StaleVersionHint': () => import('../recipe/StaleVersionHint'),
  'recipe/VersionPicker': () => import('../recipe/VersionPicker'),
} as Partial<Record<string, () => Promise<ShowcaseModule>>> as Record<
  string,
  () => Promise<ShowcaseModule>
>;
