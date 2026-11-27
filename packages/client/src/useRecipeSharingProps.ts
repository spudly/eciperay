import type {RecipeDetail, RecipeVisibility} from '@eciperay/types';
import {useLingui} from '@lingui/react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';

import type {EciperayClient} from './createEciperayClient.js';
import {invalidateRecipeQueries} from './invalidateRecipeQueries.js';
import {PRIVACY_POLICY_URL} from './legalUrls.js';
import {
  buildRecipePermalink,
  requiresPublishingConsent,
} from './recipeVisibility.js';
import type {RecipeSharingViewProps} from './ui/recipeDetailViewComponents.js';

const visibilityOptions: RecipeVisibility[] = ['private', 'unlisted', 'public'];

/**
 * The platform edges of the sharing hook, supplied by each host: the
 * base the permalinks compose from (the web page's origin on web,
 * WEB_APP_BASE_URL in the app), how a URL is handed to the user (the
 * clipboard on web, RN's Share sheet in the app), the already-localized
 * labels for that action, and whether sharing/copy outcomes surface
 * through the action message (web) or stay silent (app).
 */
export type RecipeSharingPlatform = {
  baseUrl: string;
  shareUrl: (url: string) => void;
  copyShareLinkLabel: string;
  copyPermalinkLabel: string;
  notifyOnShare?: boolean;
  surfaceMutationErrors?: boolean;
};

/**
 * The recipe sharing/visibility panel's host logic, shared by both
 * hosts since #676 (B7 T1, eciperay#552; #438 Part 3 in the app): the
 * pending-selection state, the publishing-consent flow, the share-token
 * state, and the two mutations live here, and the panel crosses into
 * RecipeDetailPage as its `sharing` data prop (RecipeSharingView's
 * view-model). The typed client is passed in by the host; share
 * execution stays at the host's edge (see RecipeSharingPlatform).
 *
 * The conditional composition is preserved by passing each block only
 * when the old panel rendered it: Save crosses only while a changed
 * selection is pending, the consent block only while the pending
 * transition requires consent, the share-link block only for unlisted
 * recipes, and the permalink block only for public ones. The consent
 * gate itself (Save disabled until consent is checked) is the view's
 * presentation of `consentRequired`, and the hook's own onSave
 * re-checks it. One presentation delta rides with the view: the
 * share-link block carries the view's hint line ("Anyone with this
 * link can view this recipe.") above its actions.
 *
 * With `surfaceMutationErrors` (web), a rejected sharing change drops
 * its pending selection so the controls match the server's visibility
 * again (#418) and rejected mutations surface through the action
 * message; without it (app) mutation failures stay silent, as the
 * app's panel behaved.
 */
export const useRecipeSharingProps = (
  client: EciperayClient,
  recipe: RecipeDetail,
  onActionMessage: (message: string) => void,
  platform: RecipeSharingPlatform,
): RecipeSharingViewProps => {
  const {i18n} = useLingui();
  const tryAgain = () =>
    i18n._({id: 'recipeDetail.pleaseTryAgain', message: 'Please try again.'});
  const visibilityLabels: Record<RecipeVisibility, string> = {
    private: i18n._({
      id: 'recipeSharing.visibilityPrivateLabel',
      message: 'Private',
    }),
    unlisted: i18n._({
      id: 'recipeSharing.visibilityUnlistedLabel',
      message: 'Unlisted link',
    }),
    public: i18n._({
      id: 'recipeSharing.visibilityPublicLabel',
      message: 'Public',
    }),
  };
  const visibilityDescriptions: Record<RecipeVisibility, string> = {
    private: i18n._({
      id: 'recipeSharing.visibilityPrivateDescription',
      message:
        "Just between you and your kitchen — only you can view this recipe, plus anyone you've already shared it with.",
    }),
    unlisted: i18n._({
      id: 'recipeSharing.visibilityUnlistedDescription',
      message: 'Anyone with the link can view it — no sign-in needed.',
    }),
    public: i18n._({
      id: 'recipeSharing.visibilityPublicDescription',
      message:
        "Out in the open — anyone can view it, and once it's past the idea stage, anyone can discover it and it may turn up in search results.",
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
    }) => client.recipes.patchSharing(recipe.id, input),
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
    ...(platform.surfaceMutationErrors
      ? {
          onError: (error: Error) => {
            // A rejected sharing change must not stay selected as if it
            // had saved (#418): drop the pending selection so the
            // controls match the server's visibility again, and surface
            // the reason.
            setPendingVisibility(null);
            setPublishingConsent(false);
            onActionMessage(
              i18n._({
                id: 'recipeSharing.couldNotUpdate',
                message: 'Could not update sharing settings: {error}',
                values: {
                  error: error instanceof Error ? error.message : tryAgain(),
                },
              }),
            );
          },
        }
      : {}),
  });

  const rotateMutation = useMutation({
    mutationFn: () => client.recipes.rotateShareToken(recipe.id),
    onSuccess: result => {
      if (result.shareToken) {
        setShareToken(result.shareToken);
      }
      void invalidate();
      onActionMessage(
        i18n._({
          id: 'recipeSharing.linkRotated',
          message: 'Share link rotated',
        }),
      );
    },
    ...(platform.surfaceMutationErrors
      ? {
          onError: (error: Error) => {
            onActionMessage(
              i18n._({
                id: 'recipeSharing.couldNotRotate',
                message: 'Could not rotate the share link: {error}',
                values: {
                  error: error instanceof Error ? error.message : tryAgain(),
                },
              }),
            );
          },
        }
      : {}),
  });

  const permalink = buildRecipePermalink(platform.baseUrl, recipe);
  const shareUrl =
    activeVisibility === 'unlisted' && shareToken
      ? buildRecipePermalink(platform.baseUrl, recipe, shareToken)
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
              "Heads up — once public, anyone can view this recipe, and once it's past the idea stage, anyone browsing Eciperay can discover it.",
          })
        : null,
    ...(consentRequired
      ? {
          consentLabel: i18n._({
            id: 'recipeSharing.consentLabel',
            message: 'Publishing consent',
          }),
          consentDescription: [
            {
              type: 'text',
              text: i18n._({
                id: 'recipeSharing.consentDescriptionStart',
                message:
                  'I understand this recipe may be viewed without signing in and I agree to the',
              }),
            },
            {type: 'text', text: ' '},
            {
              type: 'link',
              label: i18n._({
                id: 'recipeSharing.privacyPolicyLinkLabel',
                message: 'Privacy Policy',
              }),
              href: PRIVACY_POLICY_URL,
            },
            {type: 'text', text: '.'},
          ],
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
                  platform.shareUrl(shareUrl);
                  if (platform.notifyOnShare) {
                    onActionMessage(
                      i18n._({
                        id: 'recipeSharing.linkCopied',
                        message: 'Share link copied',
                      }),
                    );
                  }
                },
                copyShareLinkLabel: platform.copyShareLinkLabel,
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
            platform.shareUrl(permalink);
            if (platform.notifyOnShare) {
              onActionMessage(
                i18n._({
                  id: 'recipeSharing.permalinkCopied',
                  message: 'Permalink copied',
                }),
              );
            }
          },
          copyPermalinkLabel: platform.copyPermalinkLabel,
        }
      : {}),
  };
};
