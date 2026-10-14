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

  if (isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
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
            secondaryLabel="Cancel"
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
