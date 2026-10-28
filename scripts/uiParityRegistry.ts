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
  'RecipeListCard.tsx',
  'ScreenLoadingGate.tsx',
  'SharedRecipeListCard.tsx',
  'ui/BookLoadingSpinner.tsx',
  'ui/CheckboxField.tsx',
  'ui/InfoBanner.tsx',
  'ui/PageTitle.tsx',
  'ui/PrevNextNav.tsx',
  'ui/ScreenScroll.tsx',
  'ui/SearchField.tsx',
  'ui/ThumbnailListCard.tsx',
  'recipe/RecipeImageField.tsx',
  'recipe/RecipeInputPreview.tsx',
  'recipe/SortableIngredientList.tsx',
  'recipe/SortableInstructionList.tsx',
] as const;

export type MirrorPairPath = (typeof MIRROR_PAIRS)[number];

export const PLATFORM_ONLY: PlatformOnlyEntry[] = [
  {
    path: 'cooking/CookingModeParts.tsx',
    platform: 'app',
    reason:
      'Native cooking-mode UI fragments; web uses CookingModeView with DOM layout instead.',
  },
  {
    path: 'ui/StarRatingInput.tsx',
    platform: 'web',
    reason:
      'Web star-rating input for its cook-log form; the app renders the design system CookLogForm with the design system StarRatingInput (design-system#126). Web adoption is B7.',
  },
  {
    path: 'cooking/CookLogForm.tsx',
    platform: 'web',
    reason:
      'Web cook-log form implementation; the app renders the design system CookLogForm (design-system#126). Web adoption is B7.',
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
    path: 'RouteErrorView.tsx',
    platform: 'web',
    reason:
      'React Router route error page view (eciperay#257); the app uses React Navigation, which has no URL routing or router error boundary.',
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
    platform: 'web',
    reason:
      'Web feedback form implementation; the app renders the design system FeedbackPage via its host (design-system#126). Web adoption is B7.',
  },
  {
    path: 'ai/AiSessionFlow.tsx',
    platform: 'web',
    reason:
      'Web AI session flow implementation; the app renders the design system AiSessionPage via its host (design-system#126). Web adoption is B7.',
  },
  {
    path: 'meals/NutritionGoalProgressView.tsx',
    platform: 'web',
    reason:
      'Web view remains; the app copy had no production consumer since MealPlanDetailView folded its composition into the design system MealPlanDetailPage view-models. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipes/RecipeListFiltersBar.tsx',
    platform: 'web',
    reason:
      'Web bar remains; the app copy was superseded by the filter bars built into the design system RecipesPage/SharedWithMePage. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/CookHistoryTab.tsx',
    platform: 'web',
    reason:
      'Web tab remains for its tabbed detail page; the app copy was orphaned by the #71 single-scroll RecipeDetailPage rewire (cook-log wiring lives in the app host). Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/IngredientsTab.tsx',
    platform: 'web',
    reason:
      'Web tab remains for its tabbed detail page; the app copy was orphaned by the #71 single-scroll rewire (the design system page renders ingredients). Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/InstructionsTab.tsx',
    platform: 'web',
    reason:
      'Web tab remains for its tabbed detail page; the app copy was orphaned by the #71 single-scroll rewire (the design system page renders instructions). Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/NutritionTab.tsx',
    platform: 'web',
    reason:
      'Web tab remains for its tabbed detail page; the app copy was orphaned by the #71 single-scroll rewire (nutrition query/refresh lives in the app host). Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/OverviewActions.tsx',
    platform: 'web',
    reason:
      'Web actions remain; the app copy was only reachable via the removed OverviewTab (lifecycle mutations live in the app host). Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/OverviewTab.tsx',
    platform: 'web',
    reason:
      'Web tab remains for its tabbed detail page; the app copy was orphaned by the #71 single-scroll rewire. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/RecipeDetailChrome.tsx',
    platform: 'web',
    reason:
      'Web chrome remains; the app copy was tab-era scaffolding superseded by the design system RecipeDetailPage chrome. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/RecipeDetailTabPanel.tsx',
    platform: 'web',
    reason:
      'Web panel remains; the app copy switched tabs for the removed native tab UI. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/RecipeEngagementPanel.tsx',
    platform: 'web',
    reason:
      'Web panel remains; the app copy was only consumed by the removed tab panel (the host slots comments/visibility into the design system page). Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/RecipeRatingsSection.tsx',
    platform: 'web',
    reason:
      'Web section remains; the app copy was only reachable via the removed engagement panel (rating mutation and labels live in the app host and design system page props). Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/RecipeStatusBadge.tsx',
    platform: 'web',
    reason:
      'Web badge remains; the app copy was an adapter over ui/StatusBadge used only by the removed tab-era files. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/ScaleMultiplierButtons.tsx',
    platform: 'web',
    reason:
      'Web buttons remain; the app copy was superseded by the design system page scale controls including custom scale (@spudly/ui 1.8.1). Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/ServingsStepper.tsx',
    platform: 'web',
    reason:
      'Web stepper remains; the app copy was superseded by the design system page direct-entry servings input (@spudly/ui 1.8.1). Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/VersionPicker.tsx',
    platform: 'web',
    reason:
      'Web picker remains; the app copy was only consumed by the removed RecipeDetailChrome (the design system page has its own version picker). Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/AuthScreenLayout.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy had no production importer after the B3c auth pages moved to the design system. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/BulkSelectToolbar.tsx',
    platform: 'web',
    reason:
      'Web mirror remains live for its banners/lists; the app copy was dev-showcase-only (the widget moved to @spudly/ui in B2). Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/CheckboxSelectList.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy lost its consumers when the meal forms moved to the design system in B3b (the widget moved to @spudly/ui in B2). Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/DestructiveButton.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy had no production importer after screens adopted design system pages. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/ErrorText.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy had no production importer after screens adopted design system pages. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/FixedActionBanner.tsx',
    platform: 'web',
    reason:
      'Web mirror remains live for the consent/install banners; the app copy was dev-showcase-only (the widget moved to @spudly/ui in B2). Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/FormScreenLayout.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy had no production importer after the B3 form pages moved to the design system. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/ListLoadingFooter.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy had no production importer after screens adopted design system pages. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/MultilineField.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy had no production importer after the B3 form pages moved to the design system. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/NumberStepper.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy was only reachable via the removed ServingsStepper. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/OptionCard.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy had no production importer after screens adopted design system pages. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/ScreenContainer.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy had no production importer after screens adopted design system pages. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/StatBadge.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy was only reachable via the removed OverviewTab (the row layout moved to @spudly/ui as StatRow in B2). Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/StatusBadge.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy was only reachable via the removed RecipeStatusBadge. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/TabBar.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy was only reachable via the removed tab-era chrome/panel. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/TagPill.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy was only reachable via the removed OverviewTab (the widget moved to @spudly/ui in B2). Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/TextField.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy had no production importer after the B3 form pages moved to the design system. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/TextLinkButton.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy was only reachable via the removed NutritionGoalProgressView. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/ToggleChipGroup.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy was only reachable via the removed ScaleMultiplierButtons (callers use @spudly/ui directly). Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/RecipeCommentItem.tsx',
    platform: 'web',
    reason:
      'Web item remains; the app copy was deleted when RecipeCommentsSection adopted the design system CommentItem (the widget moved to @spudly/ui in B2). Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/StaleVersionHint.tsx',
    platform: 'web',
    reason:
      'Web hint remains; the app copy was deleted with RecipeCommentItem — its stale marker is the design system CommentItem marker now. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/SectionCard.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy was deleted when its last caller (ProfileFeedbackPreference) adopted the design system SectionCard directly. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/RadioOptionGroup.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy was deleted when RecipeVisibilityControls adopted the design system RadioOptionGroup directly. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/PrimaryButton.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy was deleted when its last callers adopted the design system Button directly. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/SecondaryButton.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy had no production importer (test/showcase only) and was deleted with the design system Button adoption. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/ProgressDots.tsx',
    platform: 'web',
    reason:
      'Web adapter remains; the app copy was deleted when CookingModeParts adopted the design system StepDots directly. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ui/EmptyMessage.tsx',
    platform: 'web',
    reason:
      'Web copy remains — production views (recipes list, shared-with-me, meals, shopping list, home, discover, access tokens) consume it; the app copy was only consumed by the in-app component showcase and was removed with it (design-system#129). The web showcase was retired in B7 cluster C2 (design-system#130); this adapter retires as its consuming views swap.',
  },
  {
    path: 'ui/SelectField.tsx',
    platform: 'web',
    reason:
      'Web copy remains — production pickers and filter bars consume it; the app copy was only consumed by the in-app component showcase and was removed with it (design-system#129). The web showcase was retired in B7 cluster C2 (design-system#130); this adapter retires as its consuming views swap.',
  },
  {
    path: 'meals/MealPlanDetailView.tsx',
    platform: 'web',
    reason:
      'Web view remains; the app host moved out of components/ to packages/app/src/hosts in B6 (design-system#129) — it renders the design system MealPlanDetailPage. Web retirement is B7.',
  },
  {
    path: 'recipes/RecipesListView.tsx',
    platform: 'web',
    reason:
      'Web view remains; the app host moved out of components/ to packages/app/src/hosts in B6 (design-system#129) — it renders the design system RecipesPage. Web retirement is B7.',
  },
  {
    path: 'shared/SharedWithMeView.tsx',
    platform: 'web',
    reason:
      'Web view remains; the app host moved out of components/ to packages/app/src/hosts in B6 (design-system#129) — it renders the design system SharedWithMePage. Web retirement is B7.',
  },
  {
    path: 'recipe/RecipeCommentsSection.tsx',
    platform: 'web',
    reason:
      'Web section remains; the app host moved out of components/ to packages/app/src/hosts in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/RecipeVisibilityControls.tsx',
    platform: 'web',
    reason:
      'Web controls remain; the app host moved out of components/ to packages/app/src/hosts in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'ProfileFeedbackPreference.tsx',
    platform: 'web',
    reason:
      'Web mirror remains; the app container moved out of components/ to packages/app/src/hosts in B6 (design-system#129). Web retirement is B7.',
  },
];

export const mirrorPairSet = new Set<string>(MIRROR_PAIRS);

export const platformOnlyByPath = new Map<string, PlatformOnlyEntry>(
  PLATFORM_ONLY.map(entry => [`${entry.platform}:${entry.path}`, entry]),
);
