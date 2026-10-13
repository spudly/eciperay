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

  if (id === 'FeedbackForm') {
    return 'Feedback';
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
  'FeedbackForm.tsx',
  'Icon.tsx',
  'InlineLoadingIndicator.tsx',
  'LegalLinks.tsx',
  'ProfileFeedbackPreference.tsx',
  'RecipeListCard.tsx',
  'ScreenLoadingGate.tsx',
  'SharedRecipeListCard.tsx',
  'add/AddRecipeMenuView.tsx',
  'auth/SignInView.tsx',
  'auth/SignUpView.tsx',
  'auth/ForgotPasswordView.tsx',
  'auth/ResetPasswordView.tsx',
  'home/HomeView.tsx',
  'profile/ProfileView.tsx',
  'recipes/RecipeListFiltersBar.tsx',
  'recipes/RecipesListView.tsx',
  'shared/SharedWithMeView.tsx',
  'tags/TagsView.tsx',
  'ui/AuthScreenLayout.tsx',
  'ui/BulkSelectToolbar.tsx',
  'ui/BookLoadingSpinner.tsx',
  'ui/CheckboxField.tsx',
  'ui/CheckboxSelectList.tsx',
  'ui/ColorPickerField.tsx',
  'ui/DestructiveButton.tsx',
  'ui/EmptyMessage.tsx',
  'ui/ErrorText.tsx',
  'ui/FixedActionBanner.tsx',
  'ui/FormScreenLayout.tsx',
  'ui/InfoBanner.tsx',
  'ui/ListLoadingFooter.tsx',
  'ui/MultilineField.tsx',
  'ui/NumberStepper.tsx',
  'ui/OptionCard.tsx',
  'ui/PageTitle.tsx',
  'ui/PrevNextNav.tsx',
  'ui/PrimaryButton.tsx',
  'ui/ProgressDots.tsx',
  'ui/RadioOptionGroup.tsx',
  'ui/ScreenContainer.tsx',
  'ui/ScreenScroll.tsx',
  'ui/SearchField.tsx',
  'ui/SecondaryButton.tsx',
  'ui/SectionCard.tsx',
  'ui/SelectField.tsx',
  'ui/StarRatingInput.tsx',
  'ui/StatBadge.tsx',
  'ui/StatusBadge.tsx',
  'ui/TabBar.tsx',
  'ui/TagPill.tsx',
  'ui/TextField.tsx',
  'ui/TextLinkButton.tsx',
  'ui/ThumbnailListCard.tsx',
  'ui/ToggleChipGroup.tsx',
  'ai/AiSessionFlow.tsx',
  'cooking/CookLogForm.tsx',
  'feedback/FeedbackView.tsx',
  'import/ImportImageView.tsx',
  'import/ImportReviewView.tsx',
  'import/ImportTextView.tsx',
  'import/ImportUrlView.tsx',
  'meals/MealCookingModeView.tsx',
  'meals/MealDetailView.tsx',
  'meals/MealFormView.tsx',
  'meals/MealPlanDetailView.tsx',
  'meals/MealPlanFormView.tsx',
  'meals/MealsHubView.tsx',
  'meals/NutritionGoalProgressView.tsx',
  'meals/ShoppingListView.tsx',
  'profile/AccessTokensTokenRow.tsx',
  'profile/AccessTokensView.tsx',
  'profile/NutritionGoalsFormView.tsx',
  'recipe/CookHistoryTab.tsx',
  'recipe/EditRecipeView.tsx',
  'recipe/EditVersionView.tsx',
  'recipe/IngredientsTab.tsx',
  'recipe/InstructionsTab.tsx',
  'recipe/ManualEntryView.tsx',
  'recipe/NutritionTab.tsx',
  'recipe/OverviewActions.tsx',
  'recipe/OverviewTab.tsx',
  'recipe/RecipeCommentItem.tsx',
  'recipe/RecipeCommentsSection.tsx',
  'recipe/RecipeDetailChrome.tsx',
  'recipe/RecipeDetailTabPanel.tsx',
  'recipe/RecipeEngagementPanel.tsx',
  'recipe/RecipeForm.tsx',
  'recipe/RecipeImageField.tsx',
  'recipe/RecipeInputPreview.tsx',
  'recipe/RecipeRatingsSection.tsx',
  'recipe/RecipeStatusBadge.tsx',
  'recipe/RecipeStatusPicker.tsx',
  'recipe/RecipeVisibilityControls.tsx',
  'recipe/ScaleMultiplierButtons.tsx',
  'recipe/ServingsStepper.tsx',
  'recipe/SortableIngredientList.tsx',
  'recipe/SortableInstructionList.tsx',
  'recipe/StaleVersionHint.tsx',
  'recipe/TagPicker.tsx',
  'recipe/VersionPicker.tsx',
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
