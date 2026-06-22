/* eslint-disable max-lines -- barrel re-exports for the shared client package */
export {scaleQuantity} from './scaleQuantity.js';
export {reorderListItem, reorderRowsByKey} from './reorderList.js';
export {createFormRowKey} from './createFormRowKey.js';
export {
  ensureIngredientRowKeys,
  ensureInstructionRowKeys,
  type FormIngredientRow,
  type FormInstructionRow,
  type RecipeFormInitial,
  toRecipeInputIngredients,
  toRecipeInputInstructions,
} from './recipeFormRows.js';
export {
  formatScaleMultiplierLabel,
  formatScaledIngredientLine,
  isActiveScaleMultiplier,
  RECIPE_SCALE_MULTIPLIERS,
  type RecipeScaleMultiplier,
  servingsForMultiplier,
  resolveRecipeServings,
  scaleFactorFromServings,
  sortIngredientsByOrder,
} from './recipeScaling.js';
export {errorMessage} from './errorMessage.js';
export {buildPrintHtml} from './buildPrintHtml.js';
export {buildShareText} from './buildShareText.js';
export {
  recipeDetailToInput,
  recipeVersionDetailToInput,
} from './recipeDetailToInput.js';
export {
  canEditActiveRecipeMetadata,
  canEditDraftVersion,
  isRecipeLifecycleEditable,
} from './recipeEditActions.js';
export {
  buildRecipePermalink,
  buildRecipeShareUrl,
  isPublishedVisibility,
  recipeVisibilityDescriptions,
  recipeVisibilityLabels,
  requiresPublishingConsent,
} from './recipeVisibility.js';
export {
  buildRecipeJsonLd,
  buildRecipeMetaDescription,
  buildRecipePageTitle,
  buildRecipeSocialMeta,
  formatSchemaDuration,
  RECIPE_SEO_SITE_NAME,
  type RecipeCommunityRating,
  type RecipeSocialMeta,
} from './recipeSeo.js';
export {publicRecipeToRecipeDetail} from './publicRecipe.js';
export {createApiClient, type ApiClient} from './createApiClient.js';
export {createSupabaseClient} from './createSupabaseClient.js';
export {
  AUTH_DEEP_LINK_REDIRECT_URL,
  AUTH_DEEP_LINK_SCHEME,
  createSessionFromAuthDeepLink,
  isAuthDeepLinkUrl,
} from './authDeepLink.js';
export {
  validateRecipeImageContent,
  validateRecipeImageFile,
} from './validateRecipeImageFile.js';
export {
  decodeBase64ToBytes,
  RECIPE_IMAGES_BUCKET,
  recipeImageStoragePath,
  type RecipeImageUploadTarget,
  uploadRecipeImage,
  uploadRecipeImageBytes,
  uploadRecipeImageFromBase64,
} from './uploadRecipeImage.js';
export {AuthProvider, useAuth} from './AuthProvider.js';
export {AnalyticsErrorBoundaryProvider} from './AnalyticsErrorBoundary.js';
export {AnalyticsProvider, useAnalytics} from './AnalyticsProvider.js';
export {
  createAnalytics,
  createNoopAnalyticsAdapter,
  type AnalyticsAdapter,
  type AnalyticsClient,
  type FeatureFlagValue,
  type LogLevel,
} from './createAnalytics.js';
export {
  useExperimentVariant,
  useFeatureFlag,
  useFeatureFlagEnabled,
} from './useFeatureFlag.js';
export {
  useAnalyticsLogger,
  type AnalyticsLogger,
} from './useAnalyticsLogger.js';
export {
  type AnalyticsEventName,
  type AnalyticsEventProperties,
  type AnalyticsPlatform,
  type RecipeCreateSource,
  type RecipeImportSource,
} from './analyticsEvents.js';
export {identifyAnalyticsUser} from './identifyAnalyticsUser.js';
export {
  ANALYTICS_CONSENT_STORAGE_KEY,
  readAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsentStatus,
} from './analyticsConsent.js';
export {
  isSensitiveAnalyticsPropertyKey,
  sanitizeAnalyticsProperties,
} from './sanitizeAnalyticsProperties.js';
export {queryKeys} from './queryKeys.js';
export {
  formatCommunityRatingLabel,
  STALE_COMMENT_HINT,
  STALE_COMMUNITY_RATING_HINT,
  STALE_VIEWER_RATING_HINT,
} from './recipeEngagement.js';
export {
  getRecipeListNextPageParam,
  homeRecentlyViewedRecipesQueryOptions,
  publicRecipeDiscoveryInfiniteQueryOptions,
  RECIPE_LIST_PAGE_SIZE,
  recipeListInfiniteQueryOptions,
  sharedWithMeInfiniteQueryOptions,
} from './recipeListQuery.js';
export {
  getRecentRecipeIds,
  recordRecipeView,
  RECIPE_VIEW_HISTORY_KEY,
  RECIPE_VIEW_HISTORY_MAX,
  removeRecipeView,
  type RecipeViewHistoryStorage,
} from './recipeViewHistory.js';
export {invalidateRecipeQueries} from './invalidateRecipeQueries.js';
export {createRecipesApi} from './recipesApi.js';
export {createImportApi} from './importApi.js';
export {createAuthApi} from './authApi.js';
export {createAccountApi} from './accountApi.js';
export {createTagsApi} from './tagsApi.js';
export {createAiApi} from './aiApi.js';
export {createVersionsApi, type TweakWithAiResult} from './versionsApi.js';
export {createCookLogsApi} from './cookLogsApi.js';
export {createTweakAiApi} from './tweakAiApi.js';
export {createCreateAiApi} from './createAiApi.js';
export {
  compareVersionToParent,
  formatParentListSummary,
  formatParentScalarHint,
  formatParentTagNames,
  parentIngredientsInput,
  parentInstructionsInput,
  parentTagIds,
  revertVersionScalar,
  type VersionDiff,
  type VersionScalarField,
} from './compareVersionToParent.js';
export {
  parseProposedRecipe,
  sortedPreviewIngredients,
  sortedPreviewInstructions,
} from './recipeInputPreview.js';
export {truncateChangeSummary} from './truncateChangeSummary.js';
export {
  createEciperayClient,
  type EciperayClient,
} from './createEciperayClient.js';
export {
  LEGAL_CONTACT_EMAIL,
  LEGAL_OPERATOR_NAME,
  MOBILE_APP_INSTALL_URL,
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
  WEB_APP_BASE_URL,
} from './legalUrls.js';
export {
  RECIPE_DEVELOPMENT_STATUS_FILTER_ALL,
  RECIPE_DEVELOPMENT_STATUS_FILTER_LABEL,
  RECIPE_DEVELOPMENT_STATUS_LABELS,
  RECIPE_DEVELOPMENT_STATUS_OPTIONS,
} from './developmentStatusCopy.js';
export {
  DISCOVER_EMPTY_MESSAGE,
  DISCOVER_NO_RATINGS_LABEL,
  DISCOVER_SEARCH_PLACEHOLDER,
  DISCOVER_TITLE,
} from './discoverCopy.js';
export {
  LANDING_DISCOVER_CTA,
  LANDING_FEATURES,
  LANDING_HERO_SUBTITLE,
  LANDING_HERO_TITLE,
  LANDING_MOBILE_APP_CTA,
  LANDING_SIGNUP_CTA,
} from './landingCopy.js';
export {
  HOME_ADD_LABEL,
  HOME_BROWSE_LABEL,
  HOME_EMPTY_MESSAGE,
  HOME_RECENT_RECIPE_COUNT,
  HOME_RECIPES_SECTION_TITLE,
  HOME_SHARED_WITH_ME_LABEL,
  HOME_SUBTITLE,
  HOME_TITLE,
  SAVE_RECIPE_COPY_LABEL,
  SHARED_WITH_ME_EMPTY_MESSAGE,
  SHARED_WITH_ME_TITLE,
} from './homeCopy.js';
