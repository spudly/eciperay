import type {RecipeDevelopmentStatus} from '@eciperay/types';

export const RECIPE_DEVELOPMENT_STATUS_OPTIONS: RecipeDevelopmentStatus[] = [
  'idea',
  'in_development',
  'perfected',
];

export const RECIPE_DEVELOPMENT_STATUS_LABELS: Record<
  RecipeDevelopmentStatus,
  string
> = {idea: 'Idea', in_development: 'In development', perfected: 'Perfected'};

export const RECIPE_DEVELOPMENT_STATUS_FILTER_ALL = 'all';
export const RECIPE_DEVELOPMENT_STATUS_FILTER_LABEL = 'Development status';
