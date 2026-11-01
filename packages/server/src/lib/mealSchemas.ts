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

const isLeapYear = (year: number): boolean =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const daysInMonth = (year: number, month: number): number => {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }
  return 31;
};

/**
 * True when a `YYYY-MM-DD` string names a date that actually exists on the
 * calendar. The format check alone accepts impossible dates such as 2026-02-31,
 * which the Postgres `date` columns for a plan's starts_on / ends_on reject at
 * insert time — surfacing as a 500 instead of a 400 (#335).
 */
const isCalendarDate = (value: string): boolean => {
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  return day <= daysInMonth(year, month);
};

const MealPlanDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isCalendarDate, {message: 'Must be a real calendar date'});

export const MealPlanInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    notes: z.string().trim().max(4000).nullish(),
    startsOn: MealPlanDateSchema.nullish(),
    endsOn: MealPlanDateSchema.nullish(),
    entries: z.array(MealPlanEntryInputSchema).min(1),
  })
  .refine(
    data =>
      !data.startsOn ||
      !data.endsOn ||
      !isCalendarDate(data.startsOn) ||
      !isCalendarDate(data.endsOn) ||
      data.endsOn >= data.startsOn,
    {message: 'endsOn must be on or after startsOn', path: ['endsOn']},
  );

export const NutritionGoalsSchema = z.object({
  calories: z.number().nonnegative().nullable(),
  proteinG: z.number().nonnegative().nullable(),
  carbsG: z.number().nonnegative().nullable(),
  fatG: z.number().nonnegative().nullable(),
  satietyScore: z.number().int().min(0).max(100).nullable(),
});
