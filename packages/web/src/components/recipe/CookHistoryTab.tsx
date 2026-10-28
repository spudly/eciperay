import {
  invalidateRecipeQueries,
  makeRecipeDetail,
  queryKeys,
  type ShowcaseDemoRenderer,
  VERSION_ID,
} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {YStack} from 'tamagui';
import type {CookLogInput} from '@eciperay/types';

import {eciperay} from '../../lib/api.js';
import {CookLogForm} from '../cooking/CookLogForm.js';
import {BookLoadingSpinner} from '../ui/BookLoadingSpinner.js';

type Props = {recipeId: string; versionId: string};

const StarDisplay = ({rating}: {rating: number}) => (
  <span aria-label={`${rating} stars`}>{'★'.repeat(rating)}</span>
);

export const CookHistoryTab = ({recipeId, versionId}: Props) => {
  const [showForm, setShowForm] = useState(false);
  // Cook-log deletion (#266) confirms in-page, mirroring recipe
  // deletion in PR #270: no window.confirm (suppressed dialogs made
  // that a silent no-op), and a failed delete surfaces an error on
  // the entry instead of failing silently.
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<{
    cookLogId: string;
    message: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const {data: cookLogs = [], isLoading} = useQuery({
    queryKey: queryKeys.cookLogs(recipeId, versionId),
    queryFn: () => eciperay.cookLogs.list(recipeId, versionId),
  });

  const createMutation = useMutation({
    mutationFn: (input: CookLogInput) =>
      eciperay.cookLogs.create(recipeId, versionId, input),
    onSuccess: async () => {
      await invalidateRecipeQueries(queryClient, recipeId, versionId);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (cookLogId: string) =>
      eciperay.cookLogs.remove(recipeId, versionId, cookLogId),
    onSuccess: async () => {
      await invalidateRecipeQueries(queryClient, recipeId, versionId);
      setConfirmingDeleteId(null);
      setDeleteError(null);
    },
    onError: (error, cookLogId) => {
      setDeleteError({
        cookLogId,
        message:
          error instanceof Error ? error.message : 'Failed to delete entry',
      });
    },
  });

  if (isLoading) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        padding="$4"
      >
        <BookLoadingSpinner size="sm" />
      </YStack>
    );
  }

  return (
    <div className="p-4">
      {showForm ? (
        <div className="mbe-4">
          <CookLogForm
            variant="light"
            isPending={createMutation.isPending}
            onSkip={() => {
              setShowForm(false);
            }}
            onSubmit={input => {
              createMutation.mutate(input);
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          className="
            bg-primary mbe-4 rounded-lg px-4 py-2 text-sm font-medium text-white
          "
          onClick={() => {
            setShowForm(true);
          }}
        >
          Log a cook
        </button>
      )}
      {cookLogs.length === 0 ? (
        <p className="text-muted text-sm">
          No cooks logged yet. Log a cook here or finish a cooking session to
          record feedback for this version.
        </p>
      ) : (
        <ol className="space-y-4">
          {cookLogs.map(log => (
            <li
              key={log.id}
              className="rounded-lg border border-gray-100 bg-gray-50 p-4"
            >
              <div className="mbe-1 flex items-center justify-between gap-2">
                <time
                  dateTime={log.cookedAt}
                  className="text-sm font-medium text-gray-900"
                >
                  {new Date(log.cookedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
                {log.authorStarRating ? (
                  <StarDisplay rating={log.authorStarRating} />
                ) : null}
              </div>
              {log.notes ? (
                <p className="text-sm text-gray-700">{log.notes}</p>
              ) : null}
              {confirmingDeleteId === log.id ? (
                <div className="mbs-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Delete this entry?
                  </span>
                  <button
                    type="button"
                    className="
                      rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium
                      text-white disabled:opacity-50
                    "
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      deleteMutation.mutate(log.id);
                    }}
                  >
                    {deleteMutation.isPending ? 'Deleting…' : 'Confirm delete'}
                  </button>
                  <button
                    type="button"
                    className="
                      rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700
                      disabled:opacity-50
                    "
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      setConfirmingDeleteId(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="mbs-3">
                  <button
                    type="button"
                    className="text-sm font-medium text-red-600"
                    onClick={() => {
                      setDeleteError(null);
                      setConfirmingDeleteId(log.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
              {deleteError?.cookLogId === log.id ? (
                <p
                  role="alert"
                  className="mbs-2 text-sm text-red-600"
                >
                  Could not delete entry: {deleteError.message}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

if (import.meta.env.DEV) {
  const cookHistoryTabDemo: ShowcaseDemoRenderer = ({Frame}) => {
    const recipe = makeRecipeDetail();
    return (
      <Frame>
        <CookHistoryTab
          recipeId={recipe.id}
          versionId={VERSION_ID}
        />
      </Frame>
    );
  };
  CookHistoryTab.demo = cookHistoryTabDemo;
}
