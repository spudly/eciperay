import {z} from 'zod';

export type ExportRecipesInput = {recipeIds: string[]};

export const ExportRecipesSchema: z.ZodType<ExportRecipesInput> = z.object({
  recipeIds: z.array(z.uuid()).min(1),
});
