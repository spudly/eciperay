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
  'ScreenLoadingGate.tsx',
  'BookLoadingSpinner.tsx',
] as const;

export type MirrorPairPath = (typeof MIRROR_PAIRS)[number];

export const PLATFORM_ONLY: PlatformOnlyEntry[] = [
  {
    path: 'cooking/CookingModeParts.tsx',
    platform: 'app',
    reason:
      'Native cooking-mode UI fragments; web renders the DS CookingModePage directly in its host page (B7 T2, eciperay#553) with its own cook-log shell.',
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
    path: 'recipe/SortableIngredientList.tsx',
    platform: 'app',
    reason:
      'App sortable list slot implementation (react-native-draggable-flatlist) for the design system RecipeFormPage; the web implementation uses dnd-kit. The mirror-pair registration was retired in the @spudly/ui 6.x migration (see the web entry).',
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
      "dnd-kit drag helper for web's recipe-form drag container (B7 T5: the DS list views render the rows; the host container routes drag-ends back as new rows arrays); the app lists carry their react-native-draggable-flatlist wiring inline.",
  },
  {
    path: 'recipe/SortableDragHandle.tsx',
    platform: 'web',
    reason:
      'Web dnd-kit sortable activator bound into the DS recipe-form row views through renderDragHandle (B7 T5, design-system#130 boundary: hosts keep their drag containers); the app binds its DraggableFlatList handle in its own lists.',
  },
  {
    path: 'profile/ProfileNutritionGoalsSection.tsx',
    platform: 'web',
    reason:
      'Web ProfilePage extract for max-lines; app ProfileScreen keeps goals query state inline.',
  },
  {
    path: 'profile/ProfileAuthorDisplaySection.tsx',
    platform: 'web',
    reason:
      'Web profile section for the author-display setting (#411); the app renders its own AuthorDisplayForm host component in hosts/profile.',
  },
  {
    path: 'profile/ProfileFamilySharingSection.tsx',
    platform: 'web',
    reason:
      'Web profile section for family sharing (#617); the app renders its own FamilySharingForm host component in hosts/profile.',
  },
  {
    path: 'profile/ProfileShowLessSection.tsx',
    platform: 'web',
    reason:
      'Web profile section for "show less like this" (#623); the app renders its own ShowLessForm host component in hosts/profile.',
  },
  {
    path: 'RecipesPageHead.tsx',
    platform: 'web',
    reason:
      'Injects the public browse ItemList JSON-LD (#411) into the document head; no native equivalent.',
  },
  {
    path: 'profile/ProfileAccessTokensSection.tsx',
    platform: 'web',
    reason:
      'Web ProfilePage extract for max-lines; app ProfileScreen uses AccessTokensSection.',
  },
  {
    path: 'profile/ProfileShowLessSection.tsx',
    platform: 'web',
    reason:
      'Web profile section for the show-less review/reset surface (#623); the soft-negative signal is web discovery-only, no app equivalent yet.',
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
      'Web routed shell layout adopting the DS AppShellPage (#451), handling both signed-in and signed-out users (#622); app uses React Navigation tab and stack navigators.',
  },
  {
    path: 'AuthGuard.tsx',
    platform: 'web',
    reason:
      'React Router outlet guard for authenticated routes; app uses navigation auth flow instead.',
  },
  {
    path: 'RecipesRoute.tsx',
    platform: 'web',
    reason:
      'React Router auth-aware route element for the one unified browse at /recipes (#622); app uses navigation auth flow instead.',
  },
  {
    path: 'AdminGuard.tsx',
    platform: 'web',
    reason:
      'React Router outlet guard for admin-only routes (#621); app instead unregisters the Tags screen in its Profile stack for non-admins.',
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
    path: 'FeedbackForm.tsx',
    platform: 'web',
    reason:
      'Web feedback host; renders the design system FeedbackPage (design-system#126) — the local view retired in B7 C10 (design-system#130). The app host lives outside src/components (hosts/FeedbackForm.tsx).',
  },
  {
    path: 'recipe/StaleVersionHint.tsx',
    platform: 'web',
    reason:
      'Web hint remains via the comments and ratings sections (public recipe page; the signed-in detail page renders stale hints from the design system page since B7 C7); the app copy was deleted with RecipeCommentItem — its stale marker is the design system CommentItem marker now. Removed in B6 (design-system#129). Web retirement is B7 (C11).',
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
