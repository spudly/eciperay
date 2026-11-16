import {
  buildRecipePermalink,
  invalidateRecipeQueries,
  PRIVACY_POLICY_URL,
  recipeVisibilityDescriptions,
  recipeVisibilityLabels,
  requiresPublishingConsent,
} from '@eciperay/client';
import type {RecipeDetail, RecipeVisibility} from '@eciperay/types';
import {eciperayTheme, type RecipeDetailPageSharing} from '@spudly/ui';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';

import {eciperay} from '../lib/api.js';

const visibilityOptions: RecipeVisibility[] = ['private', 'unlisted', 'public'];

/**
 * The recipe sharing/visibility panel's web host logic (B7 T1, eciperay#552):
 * the pending-selection state, the publishing-consent flow, the share-token
 * state, and the two mutations stay web-side, and the panel crosses into
 * RecipeDetailPage as its `sharing` data prop (RecipeSharingView's view-model)
 * — the native app's useRecipeSharingProps (packages/app/src/hosts/recipe) is
 * the template, adapted for the web panel's own behavior: permalinks compose
 * from the page's origin, the copy actions write to the clipboard and confirm
 * through the action message ("Share link copied" / "Permalink copied"), and
 * rejected mutations surface through the action message too (#418 — a rejected
 * sharing change also drops its pending selection so the controls match the
 * server's visibility again).
 *
 * The conditional composition is preserved by passing each block only when the
 * old panel rendered it: Save crosses only while a changed selection is
 * pending, the consent block only while the pending transition requires
 * consent, the share-link block only for unlisted recipes, and the permalink
 * block only for public ones. The consent gate itself (Save disabled until
 * consent is checked) is the view's presentation of `consentRequired`, and the
 * hook's own onSave re-checks it. One presentation delta rides with the view:
 * the share-link block carries the view's hint line ("Anyone with this link can
 * view this recipe.") above its actions.
 */
export const useRecipeSharingProps = (
  recipe: RecipeDetail,
  onActionMessage: (message: string) => void,
): RecipeDetailPageSharing => {
  const queryClient = useQueryClient();
  const [pendingVisibility, setPendingVisibility] =
    useState<RecipeVisibility | null>(null);
  const [publishingConsent, setPublishingConsent] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [activeVisibility, setActiveVisibility] = useState(recipe.visibility);

  useEffect(() => {
    setActiveVisibility(recipe.visibility);
  }, [recipe.visibility]);

  const invalidate = () =>
    invalidateRecipeQueries(queryClient, recipe.id, recipe.versionId);

  const sharingMutation = useMutation({
    mutationFn: (input: {
      visibility: RecipeVisibility;
      publishingConsent?: boolean;
    }) => eciperay.recipes.patchSharing(recipe.id, input),
    onSuccess: result => {
      setActiveVisibility(result.visibility);
      if (result.shareToken) {
        setShareToken(result.shareToken);
      }
      setPendingVisibility(null);
      setPublishingConsent(false);
      void invalidate();
      onActionMessage('Sharing settings updated');
    },
    onError: error => {
      // A rejected sharing change must not stay selected as if it had
      // saved (#418): drop the pending selection so the controls match
      // the server's visibility again, and surface the reason.
      setPendingVisibility(null);
      setPublishingConsent(false);
      onActionMessage(
        `Could not update sharing settings: ${
          error instanceof Error ? error.message : 'Please try again.'
        }`,
      );
    },
  });

  const rotateMutation = useMutation({
    mutationFn: () => eciperay.recipes.rotateShareToken(recipe.id),
    onSuccess: result => {
      if (result.shareToken) {
        setShareToken(result.shareToken);
      }
      void invalidate();
      onActionMessage('Share link rotated');
    },
    onError: error => {
      onActionMessage(
        `Could not rotate the share link: ${
          error instanceof Error ? error.message : 'Please try again.'
        }`,
      );
    },
  });

  const permalink = buildRecipePermalink(window.location.origin, recipe);
  const shareUrl =
    activeVisibility === 'unlisted' && shareToken
      ? buildRecipePermalink(window.location.origin, recipe, shareToken)
      : activeVisibility === 'public'
        ? permalink
        : null;

  const consentRequired =
    pendingVisibility !== null &&
    requiresPublishingConsent(recipe.visibility, pendingVisibility);

  return {
    options: visibilityOptions.map(option => ({
      value: option,
      label: recipeVisibilityLabels[option],
      description: recipeVisibilityDescriptions[option],
    })),
    value: pendingVisibility ?? recipe.visibility,
    onValueChange: (value: string) => {
      setPendingVisibility(value as RecipeVisibility);
    },
    pending: sharingMutation.isPending,
    publicWarning:
      pendingVisibility === 'public'
        ? 'This recipe will be discoverable by anyone browsing Eciperay.'
        : null,
    ...(consentRequired
      ? {
          consentLabel: 'Publishing consent',
          consentDescription: (
            <>
              I understand this recipe may be viewed without signing in and I
              agree to the{' '}
              <a
                href={PRIVACY_POLICY_URL}
                style={{
                  color: eciperayTheme.semantic.primary,
                  textDecoration: 'underline',
                }}
                target="_blank"
                rel="noreferrer"
              >
                Privacy Policy
              </a>
              .
            </>
          ),
          consentChecked: publishingConsent,
          onConsentCheckedChange: setPublishingConsent,
          consentRequired: true,
        }
      : {}),
    ...(pendingVisibility && pendingVisibility !== recipe.visibility
      ? {
          onSave: () => {
            // The view disables Save until consent is checked, but the
            // hook must not assert consent the user did not give if
            // onSave is invoked while consent is still outstanding.
            if (consentRequired && !publishingConsent) {
              return;
            }
            sharingMutation.mutate({
              visibility: pendingVisibility,
              ...(consentRequired ? {publishingConsent: true} : {}),
            });
          },
          saveLabel: 'Save sharing settings',
        }
      : {}),
    ...(activeVisibility === 'unlisted'
      ? {
          shareLinkUrl: shareUrl,
          onRotateShareLink: () => {
            rotateMutation.mutate();
          },
          rotateShareLinkLabel: shareToken
            ? 'Rotate share link'
            : 'Generate share link',
          shareLinkPending: rotateMutation.isPending,
          ...(shareUrl
            ? {
                onCopyShareLink: () => {
                  void navigator.clipboard.writeText(shareUrl);
                  onActionMessage('Share link copied');
                },
                copyShareLinkLabel: 'Copy share link',
              }
            : {}),
        }
      : {}),
    ...(activeVisibility === 'public'
      ? {
          permalinkLabel: 'Public permalink',
          permalinkUrl: permalink,
          onCopyPermalink: () => {
            void navigator.clipboard.writeText(permalink);
            onActionMessage('Permalink copied');
          },
          copyPermalinkLabel: 'Copy',
        }
      : {}),
  };
};
