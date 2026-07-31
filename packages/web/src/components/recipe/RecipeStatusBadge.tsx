import type {RecipeStatus} from '@eciperay/types';
import clsx from 'clsx';
import {normalizeRecipeStatus, RECIPE_STATUS_LABELS} from '@eciperay/client';

const STATUS_STYLES: Record<RecipeStatus, string> = {
  idea: 'bg-gray-100 text-gray-700',
  evolving: 'bg-blue-100 text-blue-800',
  perfected: 'bg-green-100 text-green-800',
  abandoned: 'bg-red-100 text-red-700 line-through',
};

type Props = {status: RecipeStatus | null | undefined};

export const RecipeStatusBadge = ({status}: Props) => {
  const normalizedStatus = normalizeRecipeStatus(status);
  return (
    <span
      className={clsx(
        'rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[normalizedStatus],
      )}
    >
      {RECIPE_STATUS_LABELS[normalizedStatus]}
    </span>
  );
};

if (import.meta.env.DEV) {
  RecipeStatusBadge.demo = function RecipeStatusBadgeDemo() {
    return <RecipeStatusBadge status="evolving" />;
  };
}
