import type {ShowcaseDemoRenderer} from '@eciperay/client';

export type ShowcaseModule = Record<string, {demo?: ShowcaseDemoRenderer}>;

export const showcaseModuleLoaders = {
  'Icon': () => import('../Icon'),
  'InlineLoadingIndicator': () => import('../InlineLoadingIndicator'),
  'LegalLinks': () => import('../LegalLinks'),
  'RecipeListCard': () => import('../RecipeListCard'),
  'ScreenLoadingGate': () => import('../ScreenLoadingGate'),
  'SharedRecipeListCard': () => import('../SharedRecipeListCard'),
  'ui/BookLoadingSpinner': () => import('../ui/BookLoadingSpinner'),
  'ui/CheckboxField': () => import('../ui/CheckboxField'),
  'ui/EmptyMessage': () => import('../ui/EmptyMessage'),
  'ui/InfoBanner': () => import('../ui/InfoBanner'),
  'ui/PageTitle': () => import('../ui/PageTitle'),
  'ui/PrevNextNav': () => import('../ui/PrevNextNav'),
  'ui/ScreenScroll': () => import('../ui/ScreenScroll'),
  'ui/SearchField': () => import('../ui/SearchField'),
  'ui/SelectField': () => import('../ui/SelectField'),
  'ui/StarRatingInput': () => import('../ui/StarRatingInput'),
  'ui/ThumbnailListCard': () => import('../ui/ThumbnailListCard'),
  'cooking/CookLogForm': () => import('../cooking/CookLogForm'),
  // Page-view migration (#49): there is deliberately no loader entry for
  // 'recipe/RecipeDetailView' — the app-side host for the design system's
  // RecipeDetailPage (@spudly/ui/pages). The host is app-only (registered
  // as such in the UI parity registry), and platform-only components are
  // in neither platform's showcase loaders or catalog.
  'recipe/RecipeImageField': () => import('../recipe/RecipeImageField'),
  'recipe/RecipeInputPreview': () => import('../recipe/RecipeInputPreview'),
  'recipe/SortableIngredientList': () =>
    import('../recipe/SortableIngredientList'),
  'recipe/SortableInstructionList': () =>
    import('../recipe/SortableInstructionList'),
} as Partial<Record<string, () => Promise<ShowcaseModule>>> as Record<
  string,
  () => Promise<ShowcaseModule>
>;
