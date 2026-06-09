import {invalidateRecipeQueries, queryKeys} from '@recipoo/client';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import type {RecipeDraft} from '@recipoo/types';

import {recipoo} from '../../lib/api.js';

type Props = {recipeId: string; draft: RecipeDraft};

export const DraftReviewCard = ({recipeId, draft}: Props) => {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await invalidateRecipeQueries(queryClient, recipeId);
  };

  const approve = useMutation({
    mutationFn: () => recipoo.drafts.approve(recipeId, draft.id),
    onSuccess: () => {
      void invalidate();
    },
  });

  const reject = useMutation({
    mutationFn: () => recipoo.drafts.reject(recipeId, draft.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.drafts(recipeId),
      });
    },
  });

  return (
    <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
      <p className="mb-1 text-sm font-semibold text-indigo-900">AI Draft</p>
      <p className="mb-3 text-sm text-gray-800">{draft.summaryOfChanges}</p>
      <div className="flex gap-2">
        <button
          type="button"
          className="
            bg-primary rounded-lg px-4 py-2 text-sm font-medium text-white
            disabled:opacity-50
          "
          disabled={approve.isPending}
          onClick={() => {
            approve.mutate();
          }}
        >
          Approve
        </button>
        <button
          type="button"
          className="
            rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700
            disabled:opacity-50
          "
          disabled={reject.isPending}
          onClick={() => {
            reject.mutate();
          }}
        >
          Reject
        </button>
      </div>
    </div>
  );
};
