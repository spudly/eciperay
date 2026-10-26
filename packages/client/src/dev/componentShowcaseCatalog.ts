/* eslint-disable max-lines -- catalog mirrors the full uiParityRegistry component list */
export type ComponentShowcaseEntry = {
  /** Mirror path without .tsx, e.g. ui/PrimaryButton */
  id: string;
  label: string;
  category: string;
};

const CATEGORY_PREFIXES: readonly (readonly [string, string])[] = [
  ['ui/', 'UI primitives'],
  ['auth/', 'Auth'],
  ['home/', 'Library'],
  ['profile/', 'Library'],
  ['recipes/', 'Library'],
  ['shared/', 'Library'],
  ['tags/', 'Library'],
  ['add/', 'Add recipe'],
  ['import/', 'Import'],
  ['recipe/', 'Recipe'],
  ['cooking/', 'Cooking'],
  ['meals/', 'Meals'],
  ['ai/', 'AI'],
  ['feedback/', 'Feedback'],
];

const categorizeShowcasePath = (id: string): string => {
  for (const [prefix, category] of CATEGORY_PREFIXES) {
    if (id.startsWith(prefix)) {
      return category;
    }
  }

  return 'Shared';
};

const labelFromShowcasePath = (path: string): string => {
  const slashIndex = path.lastIndexOf('/');
  const fileName = slashIndex === -1 ? path : path.slice(slashIndex + 1);
  return fileName.replace(/\.tsx$/, '');
};

/**
 * Mirrored components from uiParityRegistry MIRROR_PAIRS (excluding the
 * showcase itself).
 */
const SHOWCASE_MIRROR_PATHS = [
  'Icon.tsx',
  'InlineLoadingIndicator.tsx',
  'LegalLinks.tsx',
  'ProfileFeedbackPreference.tsx',
  'RecipeListCard.tsx',
  'ScreenLoadingGate.tsx',
  'SharedRecipeListCard.tsx',
  'recipes/RecipesListView.tsx',
  'shared/SharedWithMeView.tsx',
  'ui/BookLoadingSpinner.tsx',
  'ui/CheckboxField.tsx',
  'ui/ColorPickerField.tsx',
  'ui/EmptyMessage.tsx',
  'ui/InfoBanner.tsx',
  'ui/PageTitle.tsx',
  'ui/PrevNextNav.tsx',
  'ui/PrimaryButton.tsx',
  'ui/ProgressDots.tsx',
  'ui/RadioOptionGroup.tsx',
  'ui/ScreenScroll.tsx',
  'ui/SearchField.tsx',
  'ui/SecondaryButton.tsx',
  'ui/SectionCard.tsx',
  'ui/SelectField.tsx',
  'ui/StarRatingInput.tsx',
  'ui/ThumbnailListCard.tsx',
  'cooking/CookLogForm.tsx',
  'meals/MealPlanDetailView.tsx',
  'recipe/RecipeCommentItem.tsx',
  'recipe/RecipeCommentsSection.tsx',
  'recipe/RecipeImageField.tsx',
  'recipe/RecipeInputPreview.tsx',
  'recipe/RecipeVisibilityControls.tsx',
  'recipe/SortableIngredientList.tsx',
  'recipe/SortableInstructionList.tsx',
  'recipe/StaleVersionHint.tsx',
] as const;

export type ComponentShowcaseId =
  (typeof SHOWCASE_MIRROR_PATHS)[number] extends `${infer Id}.tsx` ? Id : never;

const entryFromPath = (path: string): ComponentShowcaseEntry => {
  const id = path.replace(/\.tsx$/, '');
  return {
    id,
    label: labelFromShowcasePath(path),
    category: categorizeShowcasePath(id),
  };
};

export const COMPONENT_SHOWCASE_CATALOG: ComponentShowcaseEntry[] =
  SHOWCASE_MIRROR_PATHS.map(entryFromPath).sort((left, right) => {
    if (left.category !== right.category) {
      return left.category.localeCompare(right.category);
    }
    return left.label.localeCompare(right.label);
  });

export const groupShowcaseEntriesByCategory = (
  entries: ComponentShowcaseEntry[],
): Record<string, ComponentShowcaseEntry[]> => {
  const grouped: Record<string, ComponentShowcaseEntry[]> = {};

  for (const entry of entries) {
    const bucket = grouped[entry.category];
    if (bucket) {
      bucket.push(entry);
    } else {
      grouped[entry.category] = [entry];
    }
  }

  return grouped;
};

export const filterShowcaseEntries = (
  entries: ComponentShowcaseEntry[],
  query: string,
): ComponentShowcaseEntry[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return entries;
  }

  return entries.filter(entry => {
    const haystack =
      `${entry.label} ${entry.id} ${entry.category}`.toLowerCase();
    return haystack.includes(normalized);
  });
};
