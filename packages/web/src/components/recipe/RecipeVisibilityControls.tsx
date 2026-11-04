/* eslint-disable max-lines -- sharing controls include consent and link actions */
import {
  buildRecipePermalink,
  invalidateRecipeQueries,
  PRIVACY_POLICY_URL,
  recipeVisibilityDescriptions,
  recipeVisibilityLabels,
  requiresPublishingConsent,
} from '@eciperay/client';
import type {RecipeDetail, RecipeVisibility} from '@eciperay/types';
import {Button, eciperayTheme, tokens} from '@spudly/ui';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';

import {eciperay} from '../../lib/api.js';
import {CheckboxField} from '../ui/CheckboxField.js';
import {RadioOptionGroup} from '../ui/RadioOptionGroup.js';

type Props = {recipe: RecipeDetail; onActionMessage: (message: string) => void};

const visibilityOptions: RecipeVisibility[] = ['private', 'unlisted', 'public'];

export const RecipeVisibilityControls = ({recipe, onActionMessage}: Props) => {
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

  return (
    <section
      style={{
        marginBottom: tokens.spacing[4],
        borderRadius: 12,
        border: `1px solid ${tokens.colors.gray.gray3}`,
        padding: tokens.spacing[4],
      }}
    >
      <h3
        style={{
          margin: 0,
          marginBottom: tokens.spacing[2],
          fontSize: tokens.typography.fontSize.sm,
          fontWeight: tokens.typography.fontWeight.semibold,
          color: tokens.colors.gray.gray10,
        }}
      >
        Sharing
      </h3>
      <RadioOptionGroup
        name={`visibility-${recipe.id}`}
        value={pendingVisibility ?? recipe.visibility}
        disabled={sharingMutation.isPending}
        options={visibilityOptions.map(option => ({
          value: option,
          title: recipeVisibilityLabels[option],
          description: recipeVisibilityDescriptions[option],
        }))}
        onChange={value => {
          setPendingVisibility(value as RecipeVisibility);
        }}
      />
      {pendingVisibility === 'public' ? (
        <p
          style={{
            margin: 0,
            marginTop: tokens.spacing[3],
            fontSize: tokens.typography.fontSize.sm,
            color: tokens.colors.warning.warning9,
          }}
        >
          This recipe will be discoverable by anyone browsing Eciperay.
        </p>
      ) : null}
      {pendingVisibility &&
      requiresPublishingConsent(recipe.visibility, pendingVisibility) ? (
        <CheckboxField
          checked={publishingConsent}
          onChange={setPublishingConsent}
          label="Publishing consent"
          description={
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
          }
        />
      ) : null}
      {pendingVisibility && pendingVisibility !== recipe.visibility ? (
        <Button
          variant="primary"
          size="sm"
          marginTop="$3"
          disabled={
            sharingMutation.isPending ||
            (requiresPublishingConsent(recipe.visibility, pendingVisibility) &&
              !publishingConsent)
          }
          onPress={() => {
            // The consent gate is enforced here, not only by the
            // button's disabled state: a press must never publish
            // without the consent the UI is asking for.
            if (
              sharingMutation.isPending ||
              (requiresPublishingConsent(
                recipe.visibility,
                pendingVisibility,
              ) &&
                !publishingConsent)
            ) {
              return;
            }
            sharingMutation.mutate({
              visibility: pendingVisibility,
              ...(requiresPublishingConsent(
                recipe.visibility,
                pendingVisibility,
              )
                ? {publishingConsent: true}
                : {}),
            });
          }}
        >
          Save sharing settings
        </Button>
      ) : null}
      {activeVisibility === 'unlisted' ? (
        <div style={{marginTop: tokens.spacing[3]}}>
          <Button
            variant="secondary"
            size="sm"
            disabled={rotateMutation.isPending}
            onPress={() => {
              rotateMutation.mutate();
            }}
          >
            {shareToken ? 'Rotate share link' : 'Generate share link'}
          </Button>
          {shareUrl ? (
            <Button
              variant="secondary"
              size="sm"
              marginLeft="$2"
              onPress={() => {
                void navigator.clipboard.writeText(shareUrl);
                onActionMessage('Share link copied');
              }}
            >
              Copy share link
            </Button>
          ) : null}
        </div>
      ) : null}
      {activeVisibility === 'public' ? (
        <div style={{marginTop: tokens.spacing[3]}}>
          <p
            style={{
              margin: 0,
              fontSize: tokens.typography.fontSize.xs,
              color: tokens.colors.gray.gray6,
            }}
          >
            Public permalink
          </p>
          <div
            style={{
              marginTop: tokens.spacing[1],
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing[2],
            }}
          >
            <code
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: tokens.typography.fontSize.xs,
                color: tokens.colors.gray.gray8,
              }}
            >
              {permalink}
            </code>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => {
                void navigator.clipboard.writeText(permalink);
                onActionMessage('Permalink copied');
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
};
