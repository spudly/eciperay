import {
  buildRecipePermalink,
  invalidateRecipeQueries,
  makeRecipeDetail,
  PRIVACY_POLICY_URL,
  recipeVisibilityDescriptions,
  recipeVisibilityLabels,
  requiresPublishingConsent,
  WEB_APP_BASE_URL,
} from '@eciperay/client';
import type {RecipeDetail, RecipeVisibility} from '@eciperay/types';
import type {RecipeDetailPageSharing} from '@spudly/ui';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';
import {Share} from 'react-native';
import {Text} from 'tamagui';

import {api} from '../../lib/api';
import {safeOpenUrl} from '../../lib/safeOpenUrl';

const visibilityOptions: RecipeVisibility[] = ['private', 'unlisted', 'public'];

/**
 * The recipe sharing/visibility panel's host logic (#438 Part 3): the
 * pending-selection state, the publishing-consent flow, the share-token state,
 * and the two mutations stay app-side, and the panel crosses into
 * RecipeDetailPage as its `sharing` data prop (RecipeSharingView's view-model)
 * — @spudly/ui 6.x exports pages only, so the DS Card / RadioOptionGroup /
 * Button this file used to compose are the page's own composition now.
 *
 * The conditional composition is preserved by passing each block only when the
 * old panel rendered it: Save crosses only while a changed selection is
 * pending, the consent block only while the pending transition requires
 * consent, the share-link block only for unlisted recipes, and the permalink
 * block only for public ones. The consent gate itself (Save disabled until
 * consent is checked) is the view's presentation of `consentRequired`. The
 * native share actions stay native: the view's copy intents are wired to RN's
 * Share sheet, with the labels the panel used ("Share link" / "Share
 * permalink"). One presentation delta rides with the view: the share-link block
 * carries the view's hint line ("Anyone with this link can view this recipe.")
 * above its actions.
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
    }) => api.recipes.patchSharing(recipe.id, input),
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
  });

  const rotateMutation = useMutation({
    mutationFn: () => api.recipes.rotateShareToken(recipe.id),
    onSuccess: result => {
      setShareToken(result.shareToken ?? null);
      void invalidate();
      onActionMessage('Share link rotated');
    },
  });

  const permalink = buildRecipePermalink(WEB_APP_BASE_URL, recipe);
  const shareUrl =
    activeVisibility === 'unlisted' && shareToken
      ? buildRecipePermalink(WEB_APP_BASE_URL, recipe, shareToken)
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
            <Text>
              I understand this recipe may be viewed without signing in and I
              agree to the{' '}
              <Text
                color="$primary"
                textDecorationLine="underline"
                onPress={() => {
                  void safeOpenUrl(PRIVACY_POLICY_URL);
                }}
              >
                Privacy Policy
              </Text>
              .
            </Text>
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
                  void Share.share({message: shareUrl});
                },
                copyShareLinkLabel: 'Share link',
              }
            : {}),
        }
      : {}),
    ...(activeVisibility === 'public'
      ? {
          permalinkLabel: 'Public permalink',
          permalinkUrl: permalink,
          onCopyPermalink: () => {
            void Share.share({message: permalink});
          },
          copyPermalinkLabel: 'Share permalink',
        }
      : {}),
  };
};
