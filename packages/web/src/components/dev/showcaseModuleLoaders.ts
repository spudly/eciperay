import type {ShowcaseDemoRenderer} from '@eciperay/client';

export type ShowcaseModule = Record<string, {demo?: ShowcaseDemoRenderer}>;

export const showcaseModuleLoaders = {
  'Icon': () => import('../Icon.js'),
  'InlineLoadingIndicator': () => import('../InlineLoadingIndicator.js'),
  'LegalLinks': () => import('../LegalLinks.js'),
  'RecipeListCard': () => import('../RecipeListCard.js'),
  'ScreenLoadingGate': () => import('../ScreenLoadingGate.js'),
  'SharedRecipeListCard': () => import('../SharedRecipeListCard.js'),
  'ui/BookLoadingSpinner': () => import('../ui/BookLoadingSpinner.js'),
  'ui/CheckboxField': () => import('../ui/CheckboxField.js'),
  'ui/InfoBanner': () => import('../ui/InfoBanner.js'),
  'ui/PageTitle': () => import('../ui/PageTitle.js'),
  'ui/PrevNextNav': () => import('../ui/PrevNextNav.js'),
  'ui/ScreenScroll': () => import('../ui/ScreenScroll.js'),
  'ui/SearchField': () => import('../ui/SearchField.js'),
  'ui/StarRatingInput': () => import('../ui/StarRatingInput.js'),
  'ui/ThumbnailListCard': () => import('../ui/ThumbnailListCard.js'),
  'cooking/CookLogForm': () => import('../cooking/CookLogForm.js'),
  // Page-view migration (#49): the app side has a 'recipe/RecipeDetailView'
  // host for the design system's RecipeDetailPage (@spudly/ui/pages),
  // which owns the detail tab queries, mutations, and slots on native.
  // The host is app-only (registered as such in the UI parity registry),
  // so — like the other platform-only components — it is in neither
  // platform's showcase loaders or catalog: web renders its own DOM
  // recipe detail page, and there is deliberately no web mirror file.
  'recipe/RecipeImageField': () => import('../recipe/RecipeImageField.js'),
  'recipe/RecipeInputPreview': () => import('../recipe/RecipeInputPreview.js'),
  'recipe/SortableIngredientList': () =>
    import('../recipe/SortableIngredientList.js'),
  'recipe/SortableInstructionList': () =>
    import('../recipe/SortableInstructionList.js'),
} as Record<string, () => Promise<ShowcaseModule>>;
