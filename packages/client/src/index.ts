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
export {PLAN_LABELS, apiTokensPowerNotice} from './billingCopy.js';
export {buildPrintHtml} from './buildPrintHtml.js';
export {buildShareText} from './buildShareText.js';
export {
  recipeDetailToInput,
  recipeVersionDetailToInput,
} from './recipeDetailToInput.js';
export {
  canCreateDraftVersion,
  canEditActiveRecipeMetadata,
  canEditDraftVersion,
  isRecipeStatusEditable,
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
  AUTH_DEEP_LINK_CALLBACK_PATH,
  AUTH_DEEP_LINK_HOST,
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
export {DEFAULT_LOADING_DELAY_MS, useDelayedTrue} from './useDelayedTrue.js';
export type {
  BookLoadingSpinnerProps,
  InlineLoadingIndicatorProps,
  ScreenLoadingGateProps,
} from './ui/loadingComponents.js';
export type {LegalLinksProps} from './ui/legalLinks.js';
export type {
  ForgotPasswordViewProps,
  ResetPasswordViewProps,
  SignInViewProps,
  SignUpViewProps,
} from './ui/authComponents.js';
export type {
  AuthScreenLayoutProps,
  DestructiveButtonProps,
  EmptyMessageProps,
  ErrorTextProps,
  FormScreenLayoutProps,
  InfoBannerProps,
  ListLoadingFooterProps,
  MultilineFieldProps,
  OptionCardProps,
  PageTitleProps,
  PrimaryButtonProps,
  ScreenContainerProps,
  ScreenScrollProps,
  SearchFieldProps,
  SecondaryButtonProps,
  TextFieldProps,
  TextLinkButtonProps,
} from './ui/layoutComponents.js';
export type {
  BulkSelectToolbarProps,
  CheckboxSelectItem,
  CheckboxSelectListProps,
  TabBarProps,
  TabBarTab,
  ThumbnailListCardProps,
  ToggleChipGroupProps,
  ToggleChipOption,
} from './ui/selectionComponents.js';
export type {
  CheckboxFieldProps,
  ColorPickerFieldProps,
  FixedActionBannerAction,
  FixedActionBannerProps,
  NumberStepperProps,
  PrevNextNavProps,
  ProgressDotsProps,
  RadioOption,
  RadioOptionGroupProps,
  SectionCardProps,
  SelectFieldOption,
  SelectFieldProps,
  StarRatingInputProps,
  StatBadgeProps,
  StatBadgeRowProps,
  StatusBadgeProps,
  TagPillProps,
} from './ui/formComponents.js';
export type {
  AccessTokensViewProps,
  AddRecipeMenuOption,
  AddRecipeMenuViewProps,
  EditRecipeViewProps,
  EditVersionViewProps,
  FeedbackViewProps,
  HomeViewProps,
  ImportImageViewProps,
  ImportReviewViewProps,
  ImportTextViewProps,
  ImportUrlViewProps,
  ManualEntryViewProps,
  ProfileViewProps,
  RecipeDetailChromeProps,
  RecipeDetailTab,
  RecipeListFilterControls,
  RecipesListViewProps,
  RecipeStatusFilterValue,
  SharedWithMeViewProps,
  SubscriptionViewProps,
  TagsViewProps,
} from './ui/viewComponents.js';
export {useRecipeListFilters} from './useRecipeListFilters.js';
export {demoRecipeListFilters} from './demoRecipeListFilters.js';
export type {RecipeListFilters, RecipeListParams} from './recipesListUrl.js';
export {RECIPE_DETAIL_TABS} from './ui/viewComponents.js';
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
  FEEDBACK_SHORTCUT_STORAGE_KEY,
  readFeedbackShortcutEnabled,
  writeFeedbackShortcutEnabled,
} from './feedbackPreference.js';
export {
  FeedbackPreferenceContextProvider,
  FeedbackPreferenceProvider,
  useFeedbackShortcutEnabled,
} from './FeedbackPreferenceContext.js';
export {
  submitUserFeedback,
  validateUserFeedbackMessage,
  validateUserFeedbackReplyEmail,
  USER_FEEDBACK_MESSAGE_MAX_LENGTH,
  USER_FEEDBACK_MESSAGE_MIN_LENGTH,
  type SubmitUserFeedbackInput,
} from './submitUserFeedback.js';
export {
  isSensitiveAnalyticsPropertyKey,
  sanitizeAnalyticsProperties,
  sanitizePostHogEventProperties,
} from './sanitizeAnalyticsProperties.js';
export {queryKeys} from './queryKeys.js';
export {
  formatCommunityRatingLabel,
  STALE_COMMENT_HINT,
  STALE_COMMUNITY_RATING_HINT,
  STALE_VIEWER_RATING_HINT,
} from './recipeEngagement.js';
export {
  formatDiscoveryListMeta,
  formatDisplayRatingLabel,
  formatRecipeListMeta,
  formatRecipeListSubtitle,
  formatSatietyLabel,
  formatServingsLabel,
  getDisplayRating,
} from './recipeListDisplay.js';
export {nutritionTabRows, type NutritionTabRow} from './nutritionTabRows.js';
export {
  buildMealInputFromForm,
  buildMealPlanInputFromForm,
  defaultNutritionGoals,
  formatSimpleNutrition,
  mealPlanEntryKey,
  parseMealPlanEntryKey,
} from './mealUiHelpers.js';
export {
  buildMealPlanFormEntryOptions,
  mealPlanEntryToggleResult,
  mealPlanFormDraftFromDetail,
  type MealPlanEditRecipeOption,
  type MealPlanFormDraft,
} from './mealPlanFormHelpers.js';
export {useMealPlanEditForm} from './useMealPlanEditForm.js';
export type {
  MealCookingModeViewProps,
  MealDetailViewProps,
  MealFormRecipeOption,
  MealFormViewProps,
  MealPlanDetailViewProps,
  MealPlanFormEntryOption,
  MealPlanFormViewProps,
  MealsHubTab,
  MealsHubViewProps,
  NutritionGoalProgressViewProps,
  NutritionGoalsFormViewProps,
  ShoppingListViewProps,
} from './ui/mealViewComponents.js';
export {
  getRecipeListNextPageParam,
  homeRecentlyViewedRecipesQueryOptions,
  publicRecipeDiscoveryInfiniteQueryOptions,
  RECIPE_FORM_OPTIONS_LIMIT,
  RECIPE_LIST_PAGE_SIZE,
  recipeFormOptionsQueryOptions,
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
export {createMealsApi} from './mealsApi.js';
export {createMealPlansApi} from './mealPlansApi.js';
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
  ANDROID_PLAY_STORE_URL,
  IOS_APP_STORE_URL,
  MOBILE_APP_INSTALL_URL,
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
  WEB_APP_BASE_URL,
} from './legalUrls.js';
export {
  getPrimaryMobileAppStoreUrl,
  isMobileAppInstallDismissed,
  isMobileUserAgent,
  isMobileWebBrowser,
  isStandaloneWebApp,
  MOBILE_APP_INSTALL_DISMISSAL_KEY,
  MOBILE_APP_INSTALL_DISMISSAL_MS,
  MOBILE_WEB_INSTALL_BANNER_MESSAGE,
  readMobileAppInstallDismissedUntil,
  shouldShowMobileAppInstallPrompt,
  writeMobileAppInstallDismissal,
} from './mobileWebInstall.js';
export {
  RECIPE_STATUS_FILTER_ALL,
  RECIPE_STATUS_FILTER_LABEL,
  RECIPE_STATUS_LABELS,
  RECIPE_STATUS_OPTIONS,
  normalizeRecipeStatus,
} from './recipeStatusCopy.js';
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
export {
  createShowcaseAiSessionFlowApi,
  makeRecipeDetail,
  makeRecipeVersionSummary,
  showcaseAiSessionConfig,
  VERSION_ID,
} from './dev/showcaseFixtures.js';
export {type ShowcaseFrameProps} from './dev/showcaseComponent.js';
