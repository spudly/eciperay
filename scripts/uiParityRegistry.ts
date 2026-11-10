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
  'BookLoadingSpinner.tsx',
  'recipe/RecipeImageField.tsx',
  'recipe/RecipeInputPreview.tsx',
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
    path: 'StarRatingInput.tsx',
    platform: 'web',
    reason:
      'Web star-rating input for its cook-log form, relocated out of the retired ui/ wrapper library in the @spudly/ui 6.x migration; the app has its own React Native implementation (also platform-only).',
  },
  {
    path: 'StarRatingInput.tsx',
    platform: 'app',
    reason:
      'React Native star-rating input for the app cook-log form, created in the @spudly/ui 6.x migration (the design system RatingForm is an internal view in 6.x); web has its own DOM implementation.',
  },
  {
    path: 'CookLogForm.tsx',
    platform: 'app',
    reason:
      'App cook-log form, created in the @spudly/ui 6.x migration as the host replacement for the design system RatingForm (an internal view in 6.x); web has its own implementation at cooking/CookLogForm.tsx.',
  },
  {
    path: 'ThumbnailListCard.tsx',
    platform: 'app',
    reason:
      'App list-card component, relocated out of the retired ui/ wrapper library in the @spudly/ui 6.x migration; web composes its card rows inline in RecipeListCard instead.',
  },
  {
    path: 'recipe/SortableIngredientList.tsx',
    platform: 'web',
    reason:
      'Web sortable list slot implementation (dnd-kit) for the design system RecipeFormPage; the app implementation uses react-native-draggable-flatlist. The mirror-pair registration was retired in the @spudly/ui 6.x migration, where the web side dropped the design system TextAction the app side never used.',
  },
  {
    path: 'recipe/SortableIngredientList.tsx',
    platform: 'app',
    reason:
      'App sortable list slot implementation (react-native-draggable-flatlist) for the design system RecipeFormPage; the web implementation uses dnd-kit. The mirror-pair registration was retired in the @spudly/ui 6.x migration (see the web entry).',
  },
  {
    path: 'recipe/SortableInstructionList.tsx',
    platform: 'web',
    reason:
      'Web sortable list slot implementation (dnd-kit) for the design system RecipeFormPage; the app implementation uses react-native-draggable-flatlist. The mirror-pair registration was retired in the @spudly/ui 6.x migration, where the web side dropped the design system TextAction the app side never used.',
  },
  {
    path: 'recipe/SortableInstructionList.tsx',
    platform: 'app',
    reason:
      'App sortable list slot implementation (react-native-draggable-flatlist) for the design system RecipeFormPage; the web implementation uses dnd-kit. The mirror-pair registration was retired in the @spudly/ui 6.x migration (see the web entry).',
  },
  {
    path: 'cooking/CookLogForm.tsx',
    platform: 'web',
    reason:
      'Web cook-log form implementation, used by cooking mode and the recipe-list cook-log accessory; the app has its own implementation at components/CookLogForm.tsx.',
  },
  {
    path: 'recipe/sortableDrag.ts',
    platform: 'web',
    reason:
      "dnd-kit drag helper for web's sortable ingredient/instruction list slot implementations; the app lists carry their react-native-draggable-flatlist wiring inline.",
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
    path: 'PublicHeader.tsx',
    platform: 'web',
    reason:
      'Signed-out public surfaces header (brand + Sign in) for the web public pages, added in the @spudly/ui 7.0.0 adoption (#452) when the DS retired PublicPageFrame; the public surfaces are web-only, so the app has no mirror.',
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
    path: 'PageHead.tsx',
    platform: 'web',
    reason:
      'Applies the shared page head config (#414) to the DOM document head; no native equivalent.',
  },
  {
    path: 'StaticPageHead.tsx',
    platform: 'web',
    reason:
      'Web head for static public pages from the shared head config (#414); no native equivalent.',
  },
  {
    path: 'AuthenticatedPageHead.tsx',
    platform: 'web',
    reason:
      'Web noindex head for the authenticated shell from the shared head config (#414); no native equivalent.',
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
    path: 'SelectField.tsx',
    platform: 'web',
    reason:
      'Web select field used by production pickers and filter bars, relocated out of the retired ui/ wrapper library in the @spudly/ui 6.x migration; the app copy was removed earlier (design-system#129).',
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
