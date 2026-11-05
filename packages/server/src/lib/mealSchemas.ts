import {z} from 'zod';

export const AiStepTimingResponseSchema = z.array(
  z.object({
    stepNumber: z.number().int().positive(),
    durationMin: z.number().int().nonnegative(),
  }),
);

export const MealInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    notes: z.string().trim().max(4000).nullish(),
    // Optimistic-concurrency token for PUT (#384): the `updatedAt` from the
    // client's read. Ignored on POST; on PUT a stale token fails with 409.
    expectedUpdatedAt: z.string().trim().min(1).optional(),
    // A meal needs at least one member of either kind (#362): recipes are
    // no longer required on their own now that direct ingredients exist.
    recipes: z
      .array(
        z.object({
          recipeId: z.uuid(),
          servings: z.number().int().positive().optional(),
        }),
      )
      .default([]),
    // Direct ingredients (#362): one-off entries stored on the meal.
    // Nutrition is estimated server-side at save time — clients never
    // send nutrition values for an entry. Capped at 50 (#432): every
    // entry costs one AI nutrition estimate at save time, so an
    // unbounded list would let one request fan out into unbounded
    // sequential estimation calls. Deliberately NO default: an omitted
    // list must stay distinguishable from an explicitly empty one —
    // on PUT an omitted list preserves the stored rows (see
    // replaceMeal), while a sent list, [] included, replaces them.
    ingredients: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(200),
          quantity: z.number().positive().nullish(),
          unit: z.string().trim().min(1).max(50).nullish(),
          servings: z.number().int().positive().optional(),
        }),
      )
      .max(50)
      .optional(),
  })
  .refine(
    data =>
      // When ingredients are omitted the at-least-one-member rule
      // cannot be judged here (a PUT may be preserving stored direct
      // ingredients), so it defers to the save layer, which validates
      // it against the stored rows; see saveMeal.
      data.ingredients === undefined ||
      data.recipes.length + data.ingredients.length >= 1,
    {
      message: 'A meal must contain at least one recipe or ingredient',
      path: ['recipes'],
    },
  );

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
  // Bail before splitting anything that is not exactly YYYY-MM-DD:
  // this refine also runs on values the format regex already rejected
  // (Zod collects issues from every check), and splitting an unbounded
  // string would allocate in proportion to the request body.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }
  // Year zero does not exist in the Postgres `date` type, so 0000-01-01
  // would pass the calendar math and still fail at insert time.
  if (year < 1 || month < 1 || month > 12 || day < 1) {
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
    // Optimistic-concurrency token for PUT (#384): see MealInputSchema.
    expectedUpdatedAt: z.string().trim().min(1).optional(),
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
