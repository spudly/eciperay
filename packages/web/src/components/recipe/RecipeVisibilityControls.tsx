/* eslint-disable max-lines -- sharing controls include consent and link actions */
import {
  buildRecipePermalink,
  invalidateRecipeQueries,
  makeRecipeDetail,
  PRIVACY_POLICY_URL,
  recipeVisibilityDescriptions,
  recipeVisibilityLabels,
  requiresPublishingConsent,
  type ShowcaseDemoRenderer,
} from '@eciperay/client';
import type {RecipeDetail, RecipeVisibility} from '@eciperay/types';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useEffect, useState} from 'react';

import {eciperay} from '../../lib/api.js';

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
  });

  const permalink = buildRecipePermalink(window.location.origin, recipe);
  const shareUrl =
    activeVisibility === 'unlisted' && shareToken
      ? buildRecipePermalink(window.location.origin, recipe, shareToken)
      : activeVisibility === 'public'
        ? permalink
        : null;

  return (
    <section className="mb-4 rounded-xl border border-gray-200 p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">Sharing</h3>
      <div className="space-y-2">
        {visibilityOptions.map(option => (
          <label
            key={option}
            className="
              flex cursor-pointer items-start gap-2 text-sm text-gray-700
            "
          >
            <input
              type="radio"
              name={`visibility-${recipe.id}`}
              checked={(pendingVisibility ?? recipe.visibility) === option}
              disabled={sharingMutation.isPending}
              onChange={() => {
                setPendingVisibility(option);
              }}
            />
            <span>
              <span className="font-medium">
                {recipeVisibilityLabels[option]}
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">
                {recipeVisibilityDescriptions[option]}
              </span>
            </span>
          </label>
        ))}
      </div>
      {pendingVisibility === 'public' ? (
        <p className="mt-3 text-sm text-amber-800">
          This recipe will be discoverable by anyone browsing Eciperay.
        </p>
      ) : null}
      {pendingVisibility &&
      requiresPublishingConsent(recipe.visibility, pendingVisibility) ? (
        <label className="mt-3 flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={publishingConsent}
            onChange={event => {
              setPublishingConsent(event.target.checked);
            }}
          />
          <span>
            I understand this recipe may be viewed without signing in and I
            agree to the{' '}
            <a
              href={PRIVACY_POLICY_URL}
              className="text-primary underline"
              target="_blank"
              rel="noreferrer"
            >
              Privacy Policy
            </a>
            .
          </span>
        </label>
      ) : null}
      {pendingVisibility && pendingVisibility !== recipe.visibility ? (
        <button
          type="button"
          className="
            bg-primary mt-3 rounded-lg px-3 py-2 text-sm font-medium text-white
            disabled:opacity-50
          "
          disabled={
            sharingMutation.isPending ||
            (requiresPublishingConsent(recipe.visibility, pendingVisibility) &&
              !publishingConsent)
          }
          onClick={() => {
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
        </button>
      ) : null}
      {activeVisibility === 'unlisted' ? (
        <div className="mt-3 space-y-2">
          <button
            type="button"
            className="
              rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium
              text-gray-700
              disabled:opacity-50
            "
            disabled={rotateMutation.isPending}
            onClick={() => {
              rotateMutation.mutate();
            }}
          >
            {shareToken ? 'Rotate share link' : 'Generate share link'}
          </button>
          {shareUrl ? (
            <button
              type="button"
              className="
                ms-2 rounded-lg border border-gray-200 px-3 py-2 text-sm
                font-medium text-gray-700
              "
              onClick={() => {
                void navigator.clipboard.writeText(shareUrl);
                onActionMessage('Share link copied');
              }}
            >
              Copy share link
            </button>
          ) : null}
        </div>
      ) : null}
      {activeVisibility === 'public' ? (
        <div className="mt-3">
          <p className="text-xs text-gray-500">Public permalink</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate text-xs text-gray-700">
              {permalink}
            </code>
            <button
              type="button"
              className="
                rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium
                text-gray-700
              "
              onClick={() => {
                void navigator.clipboard.writeText(permalink);
                onActionMessage('Permalink copied');
              }}
            >
              Copy
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};

if (import.meta.env.DEV) {
  const recipeVisibilityControlsDemo: ShowcaseDemoRenderer = ({Frame}) => (
    <Frame>
      <RecipeVisibilityControls
        recipe={makeRecipeDetail()}
        onActionMessage={() => {
          void 0;
        }}
      />
    </Frame>
  );
  RecipeVisibilityControls.demo = recipeVisibilityControlsDemo;
}
