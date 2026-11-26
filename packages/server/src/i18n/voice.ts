import type {Voice} from '@spudly/ui';

/**
 * The Eciperay voice object (#465) — this app's complete instance of the design
 * system's typed Voice slot system (design-system #539). The DS ships no
 * strings; this object is supplied once at the app root via <VoiceProvider
 * voice={eciperayVoice}>.
 *
 * Voice chart: the capable kitchen companion — warm and welcoming, capable and
 * unflappable, with dry wit and a hint of sarcasm aimed at situations (never at
 * the cook), encouraging and never guilt-y. Plain labels stay plain, and error
 * and safety copy stays plain too: when something goes wrong, clarity beats
 * personality.
 *
 * The server keeps its OWN copy of this object (it feeds the SSR renderer
 * for the public recipe page) while web/app share the canonical one in
 * @eciperay/client (#673): this package still depends on @spudly/ui v11,
 * whose Voice type differs from v14's — v11 requires
 * nutritionGoalsForm.carbsLabel and has no show/hide-password labels or
 * nutritionFacts slot, where v14 requires netCarbsLabel and carries both.
 * The copies are therefore NOT identical, by type necessity; fold this one
 * into the shared module when the server adopts @spudly/ui v14.
 */
export const eciperayVoice: Voice = {
  common: {
    cancelLabel: 'Cancel',
    saveLabel: 'Save',
    deleteLabel: 'Delete',
    editLabel: 'Edit',
    closeLabel: 'Close',
    retryLabel: 'Retry',
    loadingLabel: 'Loading',
  },
  commentItem: {
    editLabel: 'Edit',
    saveLabel: 'Save',
    cancelLabel: 'Cancel',
    deleteLabel: 'Delete',
  },
  ratingsCard: {
    communityRatingLabel: 'Community rating',
    noCommunityRatingsLabel: 'No community ratings yet',
    yourRatingLabel: 'Your rating',
    staleCommunityRatingHint:
      'Some community ratings were left on earlier recipe versions and count at half weight in the average.',
    staleViewerRatingHint:
      'Your rating was left on an earlier version of the recipe. Tap a star to update it for the current version.',
  },
  backLink: {label: 'Back'},
  prevNextNav: {backLabel: 'Back', nextLabel: 'Next'},
  bulkSelectToolbar: {
    selectAllLabel: 'Select all',
    clearSelectionLabel: 'Clear selection',
    searchPlaceholder: 'Search\u2026',
    selectedLabel: (count: number) => `${count} selected`,
  },
  recipeImageView: {
    label: 'Recipe image',
    emptyMessage:
      'No photo yet — add one from your library, or let AI conjure one up',
    previewLabel: 'Recipe preview',
    browseLabel: 'Browse images',
    uploadingLabel: 'Uploading\u2026',
    takePhotoLabel: 'Take photo',
    generateLabel: 'Generate with AI',
    generatingLabel: 'Generating\u2026',
    generateAccessibilityLabel: 'Generate image with AI',
    removeLabel: 'Remove image',
  },
  recipeIngredientListView: {
    label: 'Ingredients',
    emptyMessage:
      'No ingredients yet — every great dish starts with a first one',
    addLabel: '+ Add',
    addIngredientLabel: 'Add ingredient',
  },
  recipeIngredientRowView: {
    quantityPlaceholder: 'Qty',
    unitPlaceholder: 'Unit',
    namePlaceholder: 'Name',
    quantityLabel: (position: number) => `Ingredient ${position} quantity`,
    unitLabel: (position: number) => `Ingredient ${position} unit`,
    nameLabel: (position: number) => `Ingredient ${position} name`,
    removeLabel: 'Remove',
    removeIngredientLabel: (position: number) =>
      `Remove ingredient ${position}`,
  },
  recipeInstructionListView: {
    label: 'Instructions',
    emptyMessage: 'No instructions yet',
    addLabel: '+ Add',
    addInstructionLabel: 'Add instruction',
  },
  recipeInstructionRowView: {
    stepLabel: (position: number) => `Step ${position}`,
    removeLabel: 'Remove',
    removeStepLabel: (position: number) => `Remove step ${position}`,
  },
  accessTokensPanel: {
    title: 'API access tokens',
    infoText:
      'Personal access tokens let apps and scripts use the Eciperay API — including the MCP server — without signing in each time. Treat them like passwords.',
    createdSecretTitle: "Copy your new token now — you won't see it again.",
    createdSecretHint: 'Long-press the token to copy it.',
    doneLabel: 'Done',
    tokenNameLabel: 'Token name',
    tokenNamePlaceholder: 'e.g. Claude Desktop',
    createLabel: 'Create token',
    emptyMessage:
      'No tokens yet — create one when an app or script needs API access.',
  },
  accountDataView: {
    title: 'Your data',
    description:
      'Download a copy of your recipes and account data, or delete your account.',
    exportLabel: 'Download my data',
    exportPendingLabel: 'Preparing\u2026',
    deleteLabel: 'Delete account',
    deletePendingLabel: 'Deleting\u2026',
  },
  feedbackPreferenceView: {
    title: 'Preferences',
    shortcutLabel: 'Show feedback shortcut',
    shortcutDescription:
      'Adds a floating shortcut for sending feedback from anywhere in the app.',
    consentPromptText:
      'Share anonymous usage analytics to help improve the app? You can change this any time.',
    acceptLabel: 'Accept',
    declineLabel: 'Decline',
    withdrawLabel: 'Withdraw consent',
    choicesHintBefore: 'Manage your choice at any time on the ',
    choicesLinkLabel: 'privacy choices page',
  },
  subscriptionView: {
    title: 'Subscription',
    manageLabel: 'Manage subscription',
    managePendingLabel: 'Opening\u2026',
    refreshLabel: 'Check again',
    refreshPendingLabel: 'Checking\u2026',
    portalLabel: 'Open subscription portal',
  },
  transferRecipesView: {
    title: 'Transfer recipes',
    hint: 'Export recipes to a file you can keep, or import recipes from a file.',
    importLabel: 'Import recipes',
    importPendingLabel: 'Importing\u2026',
  },
  signInForm: {
    emailLabel: 'Email',
    passwordLabel: 'Password',
    submitLabel: 'Sign In',
    submitPendingLabel: 'Signing in\u2026',
    createAccountLabel: 'Create an account',
    forgotPasswordLabel: 'Forgot password?',
  },
  signUpForm: {
    nameLabel: 'Your name',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    submitLabel: 'Create Account',
    submitPendingLabel: 'Creating account\u2026',
    signInLabel: 'Already have an account? Sign in',
  },
  forgotPasswordForm: {
    emailLabel: 'Email',
    submitLabel: 'Send Reset Link',
    submitPendingLabel: 'Sending\u2026',
    backToSignInLabel: 'Back to sign in',
  },
  resetPasswordForm: {
    passwordLabel: 'New password',
    submitLabel: 'Update password',
    submitPendingLabel: 'Updating\u2026',
  },
  recipeCommentsView: {
    title: 'Comments',
    emptyMessage: 'No comments yet — how did yours turn out?',
    composerLabel: 'Add a comment',
    composerPlaceholder: 'Share how it turned out\u2026',
    postLabel: 'Post comment',
  },
  recipeSharingView: {
    title: 'Sharing',
    consentLabel: 'Publishing consent',
    saveLabel: 'Save visibility',
    savePendingLabel: 'Saving\u2026',
    shareLinkLabel: 'Anyone with this link can view this recipe.',
    rotateShareLinkLabel: 'Generate share link',
    copyShareLinkLabel: 'Copy share link',
    permalinkLabel: 'Public link',
    copyPermalinkLabel: 'Copy public link',
  },
  nutritionGoalsForm: {
    title: 'Daily nutrition goals',
    caloriesLabel: 'Calories',
    proteinLabel: 'Protein (g)',
    carbsLabel: 'Carbs (g)',
    fatLabel: 'Fat (g)',
    satietyScoreLabel: 'Satiety score',
    minLabel: 'min',
    maxLabel: 'max',
    optionalPlaceholder: 'Optional',
    saveLabel: 'Save goals',
  },
  ratingForm: {
    title: 'How did it go?',
    notesPlaceholder: 'Notes (optional)',
    secondaryLabel: 'Skip',
    saveLabel: 'Save',
  },
  changedListBanner: {revertLabel: 'Revert'},
  consentBannerView: {acceptLabel: 'Accept', declineLabel: 'Decline'},
  installBannerView: {dismissLabel: 'Dismiss install banner'},
  recipeExportPickerView: {
    searchPlaceholder: 'Search recipes\u2026',
    emptyMessage:
      'No recipes to export yet — once you add a few, they will show up here.',
    exportPendingLabel: 'Exporting\u2026',
  },
  signInPage: {heading: 'Welcome back'},
  signUpPage: {heading: 'Create account'},
  forgotPasswordPage: {
    heading: 'Reset password',
    description: "We'll send a reset link to your email.",
  },
  resetPasswordPage: {
    heading: 'New password',
    description: 'Choose a new password for your account.',
  },
  feedbackPage: {
    title: 'Feedback',
    description:
      "Share ideas, confusion, or problems. We'll include session context to help us investigate.",
    submittedMessage: 'Thanks — we got your feedback, and it genuinely helps.',
    messageLabel: "What's on your mind?",
    messagePlaceholder:
      "Tell us what happened or what you'd like to see improved.",
    replyEmailLabel: 'Email me back (optional)',
    replyEmailPlaceholder: 'you@example.com',
    bugLabel: 'This is a bug',
    submitLabel: 'Submit feedback',
    submitPendingLabel: 'Submitting\u2026',
  },
  consentPreferencesPage: {
    title: 'Privacy choices',
    description:
      'We use privacy-respecting analytics to understand which features are used and where the app can improve. You can accept or decline at any time, and change your mind whenever you like.',
    hint: 'Withdrawing consent removes your previous choice; you will be asked again the next time a feature needs it.',
    currentChoiceLabel: 'Your current choice: ',
    acceptedLabel: 'Accepted',
    declinedLabel: 'Declined',
    notSetLabel: 'Not set',
    acceptLabel: 'Accept',
    declineLabel: 'Decline',
    withdrawLabel: 'Withdraw',
  },
  routeErrorPage: {
    notFoundTitle: 'Page not found',
    notFoundMessage:
      "We couldn't find that page. It may have been moved or the link may be broken.",
    errorTitle: 'Something went wrong',
    errorMessage:
      'An unexpected error occurred. Try reloading the page, or head back home.',
    homeLabel: 'Go to the home page',
  },
  payPage: {
    title: 'Complete your purchase',
    needsTransactionTitle: 'Checkout',
    unconfiguredBody:
      "Checkout isn't configured yet, so there's nothing to pay for here.",
    needsTransactionBody:
      'This page completes a purchase started somewhere else \u2014 it needs the checkout link from that purchase to open a payment window.',
    openingLabel: 'Opening the secure payment window',
    openingMessage: 'Opening the secure payment window\u2026',
    closedBody: 'The payment window was closed before the purchase finished.',
    errorBody:
      "The payment window couldn't be opened. Check your connection and try again.",
    homeLabel: 'Go to home',
    reopenLabel: 'Reopen checkout',
    retryLabel: 'Try again',
  },
  addRecipeMenuPage: {title: 'Add Recipe'},
  manualEntryPage: {heading: 'Manual Entry'},
  legalDocumentPage: {
    lastUpdatedLabel: (lastUpdated: string) => `Last updated: ${lastUpdated}`,
  },
  autocompletePicker: {
    searchPlaceholder: 'Search\u2026',
    searchLabel: 'Search',
    searchingLabel: 'Searching',
    noResultsMessage: 'No results found.',
    resultsAvailableLabel: (count: number) =>
      `${count} ${count === 1 ? 'result' : 'results'} available`,
    removeLabel: 'Remove',
    removeItemLabel: (itemLabel: string) => `Remove ${itemLabel}`,
  },
  alert: {dismissLabel: 'Dismiss'},
  fixedActionBanner: {dismissLabel: 'Dismiss'},
  checkboxSelectList: {emptyMessage: 'No items found.'},
  selectField: {
    placeholder: 'Select\u2026',
    selectOptionLabel: 'Select an option',
  },
  colorPickerField: {
    chooseColorLabel: 'Choose a color',
    selectColorLabel: (color: string) => `Select color ${color}`,
  },
  starRatingInput: {
    label: 'Star rating',
    ratedLabel: (value: number) => `Rated ${value} out of 5 stars`,
    rateLabel: (star: number) => `Rate ${star} out of 5 stars`,
  },
  removableField: {removeLabel: 'Remove'},
  stepOverlay: {doneLabel: 'Done'},
  secretRevealPanel: {
    title: 'Your secret',
    copyLabel: 'Copy',
    hint: "Copy it now — it won't be shown again.",
    dismissLabel: 'Dismiss',
  },
  recipeOverviewPanel: {
    servingsLabel: 'Servings',
    prepLabel: 'Prep',
    cookLabel: 'Cook',
  },
  recipeIngredientsPanel: {
    servingsLabel: 'Servings',
    scaleLabel: 'Scale',
    customScaleLabel: 'Custom',
    customScaleAccessibilityLabel: 'Custom scale',
    decreaseServingsLabel: 'Decrease Servings',
    increaseServingsLabel: 'Increase Servings',
    missingIngredientsHint:
      'Tap an ingredient to mark it missing and see substitutions below.',
    findingSubstitutionsLabel: 'Finding substitutions\u2026',
    substitutionsTitle: 'Substitutions',
  },
  nutritionPanel: {
    perServingLabel: 'Per Serving',
    refreshLabel: 'Refresh',
    refreshingLabel: 'Refreshing\u2026',
    estimateLabel: 'Estimate nutrition',
    unavailableLabel: 'Nutrition is not available yet.',
  },
};
