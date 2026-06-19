import type {RecipeLifecycleStatus} from '@eciperay/types';
import clsx from 'clsx';

const STATUS_LABELS: Record<RecipeLifecycleStatus, string> = {
  idea: 'Idea',
  evolving: 'Evolving',
  perfected: 'Perfected',
  abandoned: 'Abandoned',
};

const STATUS_STYLES: Record<RecipeLifecycleStatus, string> = {
  idea: 'bg-gray-100 text-gray-700',
  evolving: 'bg-blue-100 text-blue-800',
  perfected: 'bg-green-100 text-green-800',
  abandoned: 'bg-red-100 text-red-700 line-through',
};

type Props = {status: RecipeLifecycleStatus};

export const LifecycleStatusBadge = ({status}: Props) => (
  <span
    className={clsx(
      'rounded-full px-2.5 py-0.5 text-xs font-medium',
      STATUS_STYLES[status],
    )}
  >
    {STATUS_LABELS[status]}
  </span>
);
