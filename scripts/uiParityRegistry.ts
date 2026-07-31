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
  'dev/ComponentShowcaseView.tsx',
  'dev/ShowcasePicker.tsx',
  'dev/ShowcaseDemoFrame.tsx',
  'dev/ShowcaseDemo.tsx',
  'dev/showcaseModuleLoaders.ts',
  'feedback/FeedbackView.tsx',
  'import/ImportImageView.tsx',
  'import/ImportReviewView.tsx',
  'import/ImportTextView.tsx',
  'import/ImportUrlView.tsx',
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
    path: 'discover/DiscoverView.tsx',
    platform: 'web',
    reason: 'Public recipe catalog UI; discover is a web-only SEO surface.',
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
];

export const mirrorPairSet = new Set<string>(MIRROR_PAIRS);

export const platformOnlyByPath = new Map<string, PlatformOnlyEntry>(
  PLATFORM_ONLY.map(entry => [`${entry.platform}:${entry.path}`, entry]),
);
