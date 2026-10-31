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
      'Web cook-log form implementation, still used by cooking mode; its recipe-detail consumer retired in B7 C7 (the detail host renders the design system RatingForm through the page slot, as the app host does) and its list-card consumer retired in B7 C5. The app renders the design system RatingForm (design-system#126).',
  },
  {
    path: 'recipe/sortableDrag.ts',
    platform: 'web',
    reason:
      "dnd-kit drag helper for web's sortable ingredient/instruction list slot implementations; the app lists carry their react-native-draggable-flatlist wiring inline.",
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
    path: 'FeedbackForm.tsx',
    platform: 'web',
    reason:
      'Web feedback host; renders the design system FeedbackPage (design-system#126) — the local view retired in B7 C10 (design-system#130). The app host lives outside src/components (hosts/FeedbackForm.tsx).',
  },
  {
    path: 'recipes/RecipeListFiltersBar.tsx',
    platform: 'web',
    reason:
      'Web bar remains; the app copy was superseded by the filter bars built into the design system RecipesPage/SharedWithMePage. Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/IngredientsTab.tsx',
    platform: 'web',
    reason:
      'Web tab remains for the public recipe page; its signed-in detail consumer retired in B7 C7 when the detail page adopted the design system RecipeDetailPage (the design system page renders ingredients). The app copy was orphaned by the #71 single-scroll rewire. Removed in B6 (design-system#129). Web retirement is B7 (C11).',
  },
  {
    path: 'recipe/InstructionsTab.tsx',
    platform: 'web',
    reason:
      'Web tab remains for the public recipe page; its signed-in detail consumer retired in B7 C7 when the detail page adopted the design system RecipeDetailPage (the design system page renders instructions). The app copy was orphaned by the #71 single-scroll rewire. Removed in B6 (design-system#129). Web retirement is B7 (C11).',
  },
  {
    path: 'recipe/RecipeEngagementPanel.tsx',
    platform: 'web',
    reason:
      'Web panel remains for the public recipe page; its signed-in detail consumer retired in B7 C7 (the detail host slots comments into the design system page and view-models the ratings). The app copy was only consumed by the removed tab panel. Removed in B6 (design-system#129). Web retirement is B7 (C11).',
  },
  {
    path: 'recipe/RecipeRatingsSection.tsx',
    platform: 'web',
    reason:
      'Web section remains via the engagement panel on the public recipe page; on the signed-in detail page the rating mutation and labels live in the host and design system page props since B7 C7. The app copy was only reachable via the removed engagement panel. Removed in B6 (design-system#129). Web retirement is B7 (C11).',
  },
  {
    path: 'recipe/RecipeStatusBadge.tsx',
    platform: 'web',
    reason:
      'Web badge remains for the public recipe overview; its detail-chrome consumer retired in B7 C7 (the design system page renders the status badge). The app copy was an adapter over ui/StatusBadge used only by the removed tab-era files. Removed in B6 (design-system#129). Web retirement is B7 (C11).',
  },
  {
    path: 'recipe/ScaleMultiplierButtons.tsx',
    platform: 'web',
    reason:
      'Web buttons remain via the ingredients tab on the public recipe page; the signed-in detail page uses the design system page scale controls including custom scale (@spudly/ui 1.8.1) since B7 C7. The app copy was superseded by those controls. Removed in B6 (design-system#129). Web retirement is B7 (C11).',
  },
  {
    path: 'recipe/ServingsStepper.tsx',
    platform: 'web',
    reason:
      'Web stepper remains via the ingredients tab on the public recipe page; the signed-in detail page uses the design system page direct-entry servings input (@spudly/ui 1.8.1) since B7 C7. The app copy was superseded by that input. Removed in B6 (design-system#129). Web retirement is B7 (C11).',
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
      'Web adapter remains for the meals hub; its tab-era detail chrome/panel consumers retired in B7 C7. The app copy was only reachable via the removed tab-era chrome/panel. Removed in B6 (design-system#129). Web retirement is B7 (C9).',
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
      'Web item remains via the comments section (slotted into the design system detail page and used by the public recipe page); the app copy was deleted when RecipeCommentsSection adopted the design system CommentItem (the widget moved to @spudly/ui in B2). Removed in B6 (design-system#129). Web retirement is B7.',
  },
  {
    path: 'recipe/StaleVersionHint.tsx',
    platform: 'web',
    reason:
      'Web hint remains via the comments and ratings sections (public recipe page; the signed-in detail page renders stale hints from the design system page since B7 C7); the app copy was deleted with RecipeCommentItem — its stale marker is the design system CommentItem marker now. Removed in B6 (design-system#129). Web retirement is B7 (C11).',
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
      'Web copy remains — production views (recipes list, shared-with-me, discover, access tokens) consume it; the app copy was only consumed by the in-app component showcase and was removed with it (design-system#129). The web showcase was retired in B7 cluster C2 (design-system#130); this adapter retires as its consuming views swap.',
  },
  {
    path: 'ui/SelectField.tsx',
    platform: 'web',
    reason:
      'Web copy remains — production pickers and filter bars consume it; the app copy was only consumed by the in-app component showcase and was removed with it (design-system#129). The web showcase was retired in B7 cluster C2 (design-system#130); this adapter retires as its consuming views swap.',
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
      'Web host for the design system ProfilePage feedbackPreference slot (B7 C10, design-system#130); the analytics-consent state machine stays web-side (eciperay#256/#299). The app container lives outside src/components (hosts/profile/ProfileFeedbackPreference.tsx).',
  },
];

export const mirrorPairSet = new Set<string>(MIRROR_PAIRS);

export const platformOnlyByPath = new Map<string, PlatformOnlyEntry>(
  PLATFORM_ONLY.map(entry => [`${entry.platform}:${entry.path}`, entry]),
);
