import type {RecipeDevelopmentStatus} from '@eciperay/types';
import clsx from 'clsx';
import {RECIPE_DEVELOPMENT_STATUS_LABELS} from '@eciperay/client';

const STATUS_STYLES: Record<RecipeDevelopmentStatus, string> = {
  idea: 'bg-gray-100 text-gray-700',
  in_development: 'bg-amber-100 text-amber-900',
  perfected: 'bg-green-100 text-green-800',
};

type Props = {status: RecipeDevelopmentStatus};

export const DevelopmentStatusBadge = ({status}: Props) => (
  <span
    className={clsx(
      'rounded-full px-2.5 py-0.5 text-xs font-medium',
      STATUS_STYLES[status],
    )}
  >
    {RECIPE_DEVELOPMENT_STATUS_LABELS[status]}
  </span>
);
