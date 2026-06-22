import type {RecipeDevelopmentStatus, RecipeInput} from '@eciperay/types';

export const resolveDevelopmentStatus = (
  input: Pick<RecipeInput, 'developmentStatus'>,
): RecipeDevelopmentStatus => input.developmentStatus ?? 'idea';
