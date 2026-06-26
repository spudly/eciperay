import type {RecipeInput, RecipeStatus} from '@eciperay/types';

export const resolveStatus = (
  input: Pick<RecipeInput, 'status'>,
): RecipeStatus => input.status ?? 'idea';
