/* eslint-disable max-lines -- recipe overview actions with version lifecycle controls */
import {
  canCreateDraftVersion,
  invalidateRecipeQueries,
  truncateChangeSummary,
} from '@eciperay/client';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import type {RecipeDetail, RecipeVersionSummary} from '@eciperay/types';
import {Link, useNavigate} from 'react-router-dom';

import {eciperay} from '../../lib/api.js';

type Props = {
  recipe: RecipeDetail;
  versions: RecipeVersionSummary[];
  onActionMessage: (message: string) => void;
  /**
   * The recipe's active version id, when the caller is displaying a specific
   * version: creating a draft always clones the active version, so the
   * create-draft action is only offered while the active version is the one on
   * display. Defaults to the displayed recipe's version (callers that only ever
   * show the active version).
   */
  activeVersionId?: string;
};

export const OverviewActions = ({
  recipe,
  versions,
  onActionMessage,
  activeVersionId,
}: Props) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isEditable =
    recipe.status !== 'perfected' && recipe.status !== 'abandoned';

  const candidates = versions.filter(v => v.derivedRole === 'candidate');

  const invalidate = () =>
    invalidateRecipeQueries(queryClient, recipe.id, recipe.versionId);

  const statusMutation = useMutation({
    mutationFn: (status: RecipeDetail['status']) =>
      eciperay.recipes.patchStatus(recipe.id, status),
    onSuccess: () => {
      void invalidate();
    },
  });

  const activateMutation = useMutation({
    mutationFn: (versionId: string) =>
      eciperay.versions.activate(recipe.id, versionId),
    onSuccess: () => {
      void invalidate();
      onActionMessage('Version activated');
    },
  });

  const tweakManualMutation = useMutation({
    mutationFn: () => eciperay.versions.create(recipe.id),
    onSuccess: version => {
      void invalidate();
      void navigate(`/recipes/${recipe.id}?versionId=${version.id}`);
    },
  });

  // A Perfected recipe's active version is locked, so creating a draft is
  // its only path to changes (#264): the draft opens directly in the
  // version editor, where it can actually be edited and saved.
  const canCreateDraft =
    canCreateDraftVersion(recipe.status) &&
    recipe.versionId === (activeVersionId ?? recipe.versionId);
  const createDraftMutation = useMutation({
    mutationFn: () => eciperay.versions.create(recipe.id),
    onSuccess: version => {
      void invalidate();
      void navigate(`/recipes/${recipe.id}/versions/${version.id}/edit`);
    },
  });

  if (!isEditable && !canCreateDraft && candidates.length === 0) {
    return null;
  }

  return (
    <>
      {canCreateDraft ? (
        <div className="mbe-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="
              rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium
              text-gray-700
              disabled:opacity-50
            "
            disabled={createDraftMutation.isPending}
            onClick={() => {
              createDraftMutation.mutate();
            }}
          >
            Create draft
          </button>
        </div>
      ) : null}
      {isEditable ? (
        <div className="mbe-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="
              rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium
              text-gray-700
              disabled:opacity-50
            "
            disabled={tweakManualMutation.isPending}
            onClick={() => {
              tweakManualMutation.mutate();
            }}
          >
            Tweak manually
          </button>
          <Link
            to={`/recipes/${recipe.id}/tweak-ai`}
            className="
              rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm
              font-medium text-indigo-800
            "
          >
            Tweak with AI
          </Link>
          <button
            type="button"
            className="
              rounded-lg bg-green-100 px-3 py-2 text-sm font-medium
              text-green-800
              disabled:opacity-50
            "
            disabled={statusMutation.isPending}
            onClick={() => {
              statusMutation.mutate('perfected');
            }}
          >
            Mark perfected
          </button>
          <button
            type="button"
            className="
              rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-800
              disabled:opacity-50
            "
            disabled={statusMutation.isPending}
            onClick={() => {
              statusMutation.mutate('abandoned');
            }}
          >
            Abandon
          </button>
        </div>
      ) : null}
      {candidates.length > 0 ? (
        <div className="mbe-4 space-y-2">
          <p className="text-sm font-medium text-gray-900">Ready to activate</p>
          {candidates.map(version => (
            <div
              key={version.id}
              className="rounded-lg border border-indigo-200 bg-indigo-50 p-3"
            >
              <p className="mbe-2 text-sm text-gray-800">
                v{version.versionNumber}
                {version.changeSummary
                  ? `: ${truncateChangeSummary(version.changeSummary)}`
                  : ''}
              </p>
              <button
                type="button"
                className="
                  bg-primary rounded-lg px-4 py-2 text-sm font-medium text-white
                  disabled:opacity-50
                "
                disabled={activateMutation.isPending}
                onClick={() => {
                  activateMutation.mutate(version.id);
                }}
              >
                Activate
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
};
