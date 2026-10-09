import {z} from 'zod';

export const AiStepTimingResponseSchema = z.array(
  z.object({
    stepNumber: z.number().int().positive(),
    durationMin: z.number().int().nonnegative(),
  }),
);

export const MealInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(4000).nullish(),
  recipes: z
    .array(
      z.object({
        recipeId: z.uuid(),
        servings: z.number().int().positive().optional(),
      }),
    )
    .min(1),
});

export const MealPlanEntryInputSchema = z.union([
  z.object({
    mealId: z.uuid(),
    quantity: z.number().int().positive().optional(),
  }),
  z.object({
    recipeId: z.uuid(),
    servings: z.number().int().positive().optional(),
    quantity: z.number().int().positive().optional(),
  }),
]);

export const MealPlanInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(4000).nullish(),
  startsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  endsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  entries: z.array(MealPlanEntryInputSchema).min(1),
});

export const NutritionGoalsSchema = z.object({
  calories: z.number().nonnegative().nullable(),
  proteinG: z.number().nonnegative().nullable(),
  carbsG: z.number().nonnegative().nullable(),
  fatG: z.number().nonnegative().nullable(),
  satietyScore: z.number().int().min(0).max(100).nullable(),
});
