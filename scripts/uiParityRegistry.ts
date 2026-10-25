/* eslint-disable max-lines -- source of truth for mirrored app/web component paths */
export type PlatformOnlyEntry = {
  /** Relative to packages/{app|web}/src/components/ */
  path: string;
  platform: 'app' | 'web';
  /** Required — why this component intentionally has no mirror */
  reason: string;
};

/** Same relative path in packages/app and packages/web src/components */
export const MIRROR_PAIRS = [
  'Icon.tsx',
  'InlineLoadingIndicator.tsx',
  'LegalLinks.tsx',
  'ProfileFeedbackPreference.tsx',
  'RecipeListCard.tsx',
  'ScreenLoadingGate.tsx',
  'SharedRecipeListCard.tsx',
  'meals/MealPlanDetailView.tsx',
  'meals/NutritionGoalProgressView.tsx',
  'recipes/RecipeListFiltersBar.tsx',
  'recipes/RecipesListView.tsx',
  'shared/SharedWithMeView.tsx',
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
  'cooking/CookLogForm.tsx',
  'dev/ComponentShowcaseView.tsx',
  'dev/ShowcasePicker.tsx',
  'dev/ShowcaseDemoFrame.tsx',
  'dev/ShowcaseDemo.tsx',
  'dev/showcaseModuleLoaders.ts',
  'recipe/CookHistoryTab.tsx',
  'recipe/IngredientsTab.tsx',
  'recipe/InstructionsTab.tsx',
  'recipe/NutritionTab.tsx',
  'recipe/OverviewActions.tsx',
  'recipe/OverviewTab.tsx',
  'recipe/RecipeCommentItem.tsx',
  'recipe/RecipeCommentsSection.tsx',
  'recipe/RecipeDetailChrome.tsx',
  'recipe/RecipeDetailTabPanel.tsx',
  'recipe/RecipeEngagementPanel.tsx',
  'recipe/RecipeImageField.tsx',
  'recipe/RecipeInputPreview.tsx',
  'recipe/RecipeRatingsSection.tsx',
  'recipe/RecipeStatusBadge.tsx',
  'recipe/RecipeVisibilityControls.tsx',
  'recipe/ScaleMultiplierButtons.tsx',
  'recipe/ServingsStepper.tsx',
  'recipe/SortableIngredientList.tsx',
  'recipe/SortableInstructionList.tsx',
  'recipe/StaleVersionHint.tsx',
  'recipe/VersionPicker.tsx',
] as const;

export type MirrorPairPath = (typeof MIRROR_PAIRS)[number];

export const PLATFORM_ONLY: PlatformOnlyEntry[] = [
  {
    path: 'auth/AuthTextField.tsx',
    platform: 'app',
    reason:
      'React Native TextInput wrapper for auth screens; web auth pages use native HTML inputs.',
  },
  {
    path: 'cooking/CookingModeParts.tsx',
    platform: 'app',
    reason:
      'Native cooking-mode UI fragments; web uses CookingModeView with DOM layout instead.',
  },
  {
    path: 'recipe/RecipeDetailTabBar.tsx',
    platform: 'app',
    reason:
      'Thin wrapper over ui/TabBar for native RecipeDetailChrome; web RecipeDetailChrome uses TabBar directly.',
  },
  {
    path: 'recipe/RecipeDetailView.tsx',
    platform: 'app',
    reason:
      'App-side host for the design system RecipeDetailPage (#49): owns the detail section queries, mutations, and slots; web renders its own DOM recipe detail page.',
  },
  {
    path: 'recipe/RecipeForm.tsx',
    platform: 'app',
    reason:
      'App-side host for the design system RecipeFormPage (design-system#124): owns the form state, tags query, image processing, AI calls, and version diffing; web renders its own DOM recipe form until B7.',
  },
  {
    path: 'recipe/RecipeForm.tsx',
    platform: 'web',
    reason:
      'Web recipe form implementation; the app renders the design system RecipeFormPage via its host (design-system#124). Web adoption is B7.',
  },
  {
    path: 'recipe/EditRecipeView.tsx',
    platform: 'web',
    reason:
      'Web shell for its recipe form pages; the app renders the design system EditRecipePage (design-system#124). Web adoption is B7.',
  },
  {
    path: 'recipe/EditVersionView.tsx',
    platform: 'web',
    reason:
      'Web shell for its recipe form pages; the app renders the design system EditVersionPage (design-system#124). Web adoption is B7.',
  },
  {
    path: 'recipe/ManualEntryView.tsx',
    platform: 'web',
    reason:
      'Web shell for its recipe form pages; the app renders the design system ManualEntryPage (design-system#124). Web adoption is B7.',
  },
  {
    path: 'recipe/RecipeStatusPicker.tsx',
    platform: 'web',
    reason:
      'Web status picker for its recipe form; the app form passes status options as props to the design system RecipeFormPage (design-system#124).',
  },
  {
    path: 'recipe/TagPicker.tsx',
    platform: 'web',
    reason:
      'Web tag picker for its recipe form; the app form host runs the tags query and passes options to the design system RecipeFormPage (design-system#124).',
  },
  {
    path: 'meals/MealFormView.tsx',
    platform: 'web',
    reason:
      'Web meal form implementation; the app renders the design system MealFormPage (design-system#125). Web adoption is B7.',
  },
  {
    path: 'meals/MealPlanFormView.tsx',
    platform: 'web',
    reason:
      'Web meal plan form implementation; the app renders the design system MealPlanFormPage (design-system#125). Web adoption is B7.',
  },
  {
    path: 'meals/ShoppingListView.tsx',
    platform: 'web',
    reason:
      'Web shopping list implementation; the app renders the design system ShoppingListPage (design-system#125). Web adoption is B7.',
  },
  {
    path: 'meals/MealCookingModeView.tsx',
    platform: 'web',
    reason:
      'Web cooking-mode implementation; the app renders the design system MealCookingModePage (design-system#125). Web adoption is B7.',
  },
  {
    path: 'meals/MealDetailView.tsx',
    platform: 'web',
    reason:
      'Web meal detail implementation; the app renders the design system MealDetailPage (design-system#125). Web adoption is B7.',
  },
  {
    path: 'meals/MealsHubView.tsx',
    platform: 'web',
    reason:
      'Web meals hub implementation; the app renders the design system MealsHubPage (design-system#125). Web adoption is B7.',
  },
  {
    path: 'profile/AccessTokensSection.tsx',
    platform: 'app',
    reason:
      'App ProfileScreen extract for the tokens section; web ProfilePage uses ProfileAccessTokensSection.',
  },
  {
    path: 'discover/DiscoverView.tsx',
    platform: 'web',
    reason: 'Public recipe catalog UI; discover is a web-only SEO surface.',
  },
  {
    path: 'recipes/RecipeListNumberFilter.tsx',
    platform: 'web',
    reason:
      'Web number-filter field extracted for max-lines; app inlines TextInput in RecipeListFiltersBar.',
  },
  {
    path: 'profile/ProfileNutritionGoalsSection.tsx',
    platform: 'web',
    reason:
      'Web ProfilePage extract for max-lines; app ProfileScreen keeps goals query state inline.',
  },
  {
    path: 'profile/ProfileAccessTokensSection.tsx',
    platform: 'web',
    reason:
      'Web ProfilePage extract for max-lines; app ProfileScreen uses AccessTokensSection.',
  },
  {
    path: 'profile/ProfileSubscriptionSection.tsx',
    platform: 'web',
    reason:
      'Web ProfilePage section for plan display and the Paddle portal link; the app has no billing surface yet (mobile billing is deferred).',
  },
  {
    path: 'profile/SubscriptionView.tsx',
    platform: 'web',
    reason:
      'Web presenter for the profile subscription section; the app has no billing surface yet (mobile billing is deferred).',
  },
  {
    path: 'recipes/RecipeListStatusIngredientFilters.tsx',
    platform: 'web',
    reason:
      'Web status/ingredient filter row extracted for max-lines; app inlines those fields in RecipeListFiltersBar.',
  },
  {
    path: 'legal/LegalInlineLink.tsx',
    platform: 'web',
    reason:
      'Styled mailto link for legal document content; app opens legal URLs externally.',
  },
  {
    path: 'legal/LegalProseList.tsx',
    platform: 'web',
    reason:
      'Prose list styling for in-app legal pages; no native legal document renderer.',
  },
  {
    path: 'marketing/MarketingLandingView.tsx',
    platform: 'web',
    reason:
      'Marketing/SEO landing page sections; no native marketing site equivalent.',
  },
  {
    path: 'public/PublicRecipePageShell.tsx',
    platform: 'web',
    reason:
      'Public recipe tab shell for SEO pages; no native public recipe surface.',
  },
  {
    path: 'AnalyticsConsentBanner.tsx',
    platform: 'web',
    reason: 'Browser cookie/consent banner; no native equivalent.',
  },
  {
    path: 'AppShell.tsx',
    platform: 'web',
    reason:
      'Web top-nav shell; app uses React Navigation tab and stack navigators.',
  },
  {
    path: 'AuthGuard.tsx',
    platform: 'web',
    reason:
      'React Router outlet guard for authenticated routes; app uses navigation auth flow instead.',
  },
  {
    path: 'FeedbackBubble.tsx',
    platform: 'web',
    reason:
      'Floating feedback widget for web layout; app uses a dedicated Feedback screen.',
  },
  {
    path: 'LegalDocumentPage.tsx',
    platform: 'web',
    reason: 'Renders legal markdown for in-app web routes (/privacy, /terms).',
  },
  {
    path: 'LegalPageLayout.tsx',
    platform: 'web',
    reason:
      'Web legal page chrome; app opens legal URLs externally via Linking.',
  },
  {
    path: 'MobileAppInstallBanner.tsx',
    platform: 'web',
    reason: 'Promotes native app install from the mobile web experience.',
  },
  {
    path: 'ProfileAccountDataSection.tsx',
    platform: 'web',
    reason:
      'Web account data export UI; not exposed in the native app profile flow.',
  },
  {
    path: 'profile/ProfileTransferSection.tsx',
    platform: 'web',
    reason:
      'Web profile recipe import/export UI; native app profile flow has no bulk transfer section.',
  },
  {
    path: 'PublicPageLayout.tsx',
    platform: 'web',
    reason:
      'Public/marketing page layout for SEO; no native marketing site equivalent.',
  },
  {
    path: 'PublicRecipeDiscoveryCard.tsx',
    platform: 'web',
    reason: 'Discover page card for public web catalog; discover is web-only.',
  },
  {
    path: 'PublicRecipeError.tsx',
    platform: 'web',
    reason: 'Public recipe error state for web SEO pages.',
  },
  {
    path: 'RecipeExportPicker.tsx',
    platform: 'web',
    reason: 'Recipe export selection UI; export flow is web-only.',
  },
  {
    path: 'RecipePageHead.tsx',
    platform: 'web',
    reason:
      'Sets document title and social meta tags for SEO; no native equivalent.',
  },
  {
    path: 'RootLayout.tsx',
    platform: 'web',
    reason:
      'React Router root layout with providers; app uses App.tsx entry instead.',
  },
  {
    path: 'cooking/CookingModeView.tsx',
    platform: 'web',
    reason:
      'Web cooking mode page shell; app uses CookingScreen with CookingModeParts.',
  },
  {
    path: 'cooking/ScaledIngredientsList.tsx',
    platform: 'web',
    reason:
      'Web cooking ingredients panel; native cooking screen renders its own layout.',
  },
  {
    path: 'recipe/PublicRecipeCtas.tsx',
    platform: 'web',
    reason:
      'Public recipe call-to-action buttons for unauthenticated web visitors.',
  },
  {
    path: 'recipe/PublicRecipeOverview.tsx',
    platform: 'web',
    reason:
      'Public recipe overview for SEO pages; no native public recipe surface.',
  },
  {
    path: 'recipe/SortableIngredientRow.tsx',
    platform: 'web',
    reason:
      'dnd-kit sortable row primitive for web; app uses react-native-draggable-flatlist in SortableIngredientList.',
  },
  {
    path: 'recipe/SortableInstructionRow.tsx',
    platform: 'web',
    reason:
      'dnd-kit sortable row primitive for web; app uses react-native-draggable-flatlist in SortableInstructionList.',
  },
  {
    path: 'auth/SignInView.tsx',
    platform: 'web',
    reason:
      'Web sign-in view; the app renders the design system SignInPage (design-system#126). Web adoption is B7.',
  },
  {
    path: 'auth/SignUpView.tsx',
    platform: 'web',
    reason:
      'Web sign-up view; the app renders the design system SignUpPage (design-system#126). Web adoption is B7.',
  },
  {
    path: 'auth/ForgotPasswordView.tsx',
    platform: 'web',
    reason:
      'Web forgot-password view; the app renders the design system ForgotPasswordPage (design-system#126). Web adoption is B7.',
  },
  {
    path: 'auth/ResetPasswordView.tsx',
    platform: 'web',
    reason:
      'Web reset-password view; the app renders the design system ResetPasswordPage (design-system#126). Web adoption is B7.',
  },
  {
    path: 'home/HomeView.tsx',
    platform: 'web',
    reason:
      'Web home view; the app renders the design system HomePage (design-system#126). Web adoption is B7.',
  },
  {
    path: 'tags/TagsView.tsx',
    platform: 'web',
    reason:
      'Web tags view; the app renders the design system TagsPage (design-system#126). Web adoption is B7.',
  },
  {
    path: 'add/AddRecipeMenuView.tsx',
    platform: 'web',
    reason:
      'Web add-recipe menu; the app renders the design system AddRecipeMenuPage (design-system#126). Web adoption is B7.',
  },
  {
    path: 'profile/ProfileView.tsx',
    platform: 'web',
    reason:
      'Web profile view; the app renders the design system ProfilePage (design-system#126). Web adoption is B7.',
  },
  {
    path: 'profile/AccessTokensView.tsx',
    platform: 'web',
    reason:
      'Web access tokens section; the app renders the design system AccessTokensPanel (design-system#126). Web adoption is B7.',
  },
  {
    path: 'profile/AccessTokensTokenRow.tsx',
    platform: 'web',
    reason:
      'Web token row; the app renders the design system AccessTokensPanel, whose rows are design system TokenRows (design-system#126). Web adoption is B7.',
  },
  {
    path: 'profile/NutritionGoalsFormView.tsx',
    platform: 'web',
    reason:
      'Web nutrition goals form; the app renders the design system NutritionGoalsForm (design-system#126). Web adoption is B7.',
  },
  {
    path: 'import/ImportTextView.tsx',
    platform: 'web',
    reason:
      'Web import-from-text view; the app renders the design system ImportTextPage (design-system#126). Web adoption is B7.',
  },
  {
    path: 'import/ImportUrlView.tsx',
    platform: 'web',
    reason:
      'Web import-from-URL view; the app renders the design system ImportUrlPage (design-system#126). Web adoption is B7.',
  },
  {
    path: 'import/ImportImageView.tsx',
    platform: 'web',
    reason:
      'Web import-from-image view; the app renders the design system ImportImagePage (design-system#126). Web adoption is B7.',
  },
  {
    path: 'import/ImportReviewView.tsx',
    platform: 'web',
    reason:
      'Web import review view; the app renders the design system ImportReviewPage (design-system#126). Web adoption is B7.',
  },
  {
    path: 'FeedbackForm.tsx',
    platform: 'app',
    reason:
      'App-side host for the design system FeedbackPage (design-system#126): owns the analytics submission, reply-email prefill rules, focus reset, and validation; web keeps its form implementation until B7.',
  },
  {
    path: 'FeedbackForm.tsx',
    platform: 'web',
    reason:
      'Web feedback form implementation; the app renders the design system FeedbackPage via its host (design-system#126). Web adoption is B7.',
  },
  {
    path: 'ai/AiSessionFlow.tsx',
    platform: 'app',
    reason:
      'App-side host for the design system AiSessionPage (design-system#126): owns the session state machine, the session mutations, and error mapping; web keeps its flow implementation until B7.',
  },
  {
    path: 'ai/AiSessionFlow.tsx',
    platform: 'web',
    reason:
      'Web AI session flow implementation; the app renders the design system AiSessionPage via its host (design-system#126). Web adoption is B7.',
  },
];

export const mirrorPairSet = new Set<string>(MIRROR_PAIRS);

export const platformOnlyByPath = new Map<string, PlatformOnlyEntry>(
  PLATFORM_ONLY.map(entry => [`${entry.platform}:${entry.path}`, entry]),
);
