import {useLingui} from '@lingui/react';
import {
  buildRecipePermalink,
  invalidateRecipeQueries,
  makeRecipeDetail,
  PRIVACY_POLICY_URL,
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
  const {i18n} = useLingui();
  const visibilityLabels: Record<RecipeVisibility, string> = {
    private: i18n._({id: 'recipeSharing.visibilityPrivateLabel', message: 'Private'}),
    unlisted: i18n._({
      id: 'recipeSharing.visibilityUnlistedLabel',
      message: 'Unlisted link',
    }),
    public: i18n._({id: 'recipeSharing.visibilityPublicLabel', message: 'Public'}),
  };
  const visibilityDescriptions: Record<RecipeVisibility, string> = {
    private: i18n._({
      id: 'recipeSharing.visibilityPrivateDescription',
      message: 'Just between you and your kitchen — only you can view this recipe, plus anyone you've already shared it with.',
    }),
    unlisted: i18n._({
      id: 'recipeSharing.visibilityUnlistedDescription',
      message: 'Anyone with the link can view it — no sign-in needed.',
    }),
    public: i18n._({
      id: 'recipeSharing.visibilityPublicDescription',
      message: 'Out in the open — anyone can view it, and once it's past the idea stage, anyone can discover it and it may turn up in search results.',
    }),
  };
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
      onActionMessage(
        i18n._({
          id: 'recipeSharing.settingsUpdated',
          message: 'Sharing settings updated',
        }),
      );
    },
  });

  const rotateMutation = useMutation({
    mutationFn: () => api.recipes.rotateShareToken(recipe.id),
    onSuccess: result => {
      setShareToken(result.shareToken ?? null);
      void invalidate();
      onActionMessage(
        i18n._({id: 'recipeSharing.linkRotated', message: 'Share link rotated'}),
      );
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
      label: visibilityLabels[option],
      description: visibilityDescriptions[option],
    })),
    value: pendingVisibility ?? recipe.visibility,
    onValueChange: (value: string) => {
      setPendingVisibility(value as RecipeVisibility);
    },
    pending: sharingMutation.isPending,
    publicWarning:
      pendingVisibility === 'public'
        ? i18n._({
            id: 'recipeSharing.publicWarning',
            message:
              'Heads up — once public, anyone can view this recipe, and once it's past the idea stage, anyone browsing Eciperay can discover it.',
          })
        : null,
    ...(consentRequired
      ? {
          consentLabel: i18n._({
            id: 'recipeSharing.consentLabel',
            message: 'Publishing consent',
          }),
          consentDescription: (
            <Text>
              {i18n._({
                id: 'recipeSharing.consentDescriptionStart',
                message:
                  'I understand this recipe may be viewed without signing in and I agree to the',
              })}{' '}
              <Text
                color="$primary"
                textDecorationLine="underline"
                onPress={() => {
                  void safeOpenUrl(PRIVACY_POLICY_URL);
                }}
              >
                {i18n._({
                  id: 'recipeSharing.privacyPolicyLinkLabel',
                  message: 'Privacy Policy',
                })}
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
          saveLabel: i18n._({
            id: 'recipeSharing.saveLabel',
            message: 'Save sharing settings',
          }),
        }
      : {}),
    ...(activeVisibility === 'unlisted'
      ? {
          shareLinkUrl: shareUrl,
          onRotateShareLink: () => {
            rotateMutation.mutate();
          },
          rotateShareLinkLabel: shareToken
            ? i18n._({
                id: 'recipeSharing.rotateLabel',
                message: 'Rotate share link',
              })
            : i18n._({
                id: 'recipeSharing.generateLabel',
                message: 'Generate share link',
              }),
          shareLinkPending: rotateMutation.isPending,
          ...(shareUrl
            ? {
                onCopyShareLink: () => {
                  void Share.share({message: shareUrl});
                },
                copyShareLinkLabel: i18n._({
                  id: 'recipeSharing.copyLinkLabel',
                  message: 'Share link',
                }),
              }
            : {}),
        }
      : {}),
    ...(activeVisibility === 'public'
      ? {
          permalinkLabel: i18n._({
            id: 'recipeSharing.permalinkLabel',
            message: 'Public permalink',
          }),
          permalinkUrl: permalink,
          onCopyPermalink: () => {
            void Share.share({message: permalink});
          },
          copyPermalinkLabel: i18n._({
            id: 'recipeSharing.copyPermalinkLabel',
            message: 'Share permalink',
          }),
        }
      : {}),
  };
};
