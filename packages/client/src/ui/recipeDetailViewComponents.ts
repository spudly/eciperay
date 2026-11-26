/**
 * The recipe detail page's sharing and comments section view-models,
 * mirrored from @spudly/ui's RecipeSharingView / RecipeCommentsView
 * props (the client's own ui/* convention: the shared hooks in
 * useRecipeSharingProps / useRecipeCommentsProps return these shapes,
 * and the hosts pass them straight into RecipeDetailPage, whose props
 * they match structurally).
 */

export type RecipeSharingConsentSpan =
  | {type: 'text'; text: string}
  | {type: 'link'; label: string; href: string};

export type RecipeSharingOption = {
  value: string;
  label: string;
  description?: string;
};

export type RecipeSharingViewProps = {
  title?: string;
  options: RecipeSharingOption[];
  value: string;
  onValueChange: (value: string) => void;
  pending?: boolean;
  publicWarning?: string | null;
  consentLabel?: string;
  consentDescription?: string | RecipeSharingConsentSpan[];
  consentChecked?: boolean;
  onConsentCheckedChange?: (checked: boolean) => void;
  consentRequired?: boolean;
  onSave?: () => void;
  saveLabel?: string;
  savePendingLabel?: string;
  shareLinkLabel?: string;
  shareLinkUrl?: string | null;
  onRotateShareLink?: () => void;
  rotateShareLinkLabel?: string;
  shareLinkPending?: boolean;
  onCopyShareLink?: () => void;
  copyShareLinkLabel?: string;
  permalinkLabel?: string;
  permalinkUrl?: string | null;
  onCopyPermalink?: () => void;
  copyPermalinkLabel?: string;
  loading?: boolean;
};

export type RecipeCommentsViewComment = {
  id: string;
  authorName: string;
  body: string;
  isStale?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
};

export type RecipeCommentsViewProps = {
  comments: RecipeCommentsViewComment[];
  loading?: boolean;
  error?: string | null;
  title?: string;
  emptyMessage?: string;
  staleHintLabel?: string;
  editingCommentId?: string | null;
  editDraft?: string;
  isUpdatePending?: boolean;
  isDeletePending?: boolean;
  onEditDraftChange?: (value: string) => void;
  onStartEdit?: (commentId: string) => void;
  onCancelEdit?: () => void;
  onSaveEdit?: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  draft?: string;
  onDraftChange?: (value: string) => void;
  onPost?: () => void;
  isPostPending?: boolean;
  composerLabel?: string;
  composerPlaceholder?: string;
  postLabel?: string;
};
