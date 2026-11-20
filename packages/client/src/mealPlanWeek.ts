import type {
  AggregatedNutrition,
  MealPlanDetail,
  MealPlanEntry,
} from '@eciperay/types';

/**
 * Week-view grouping for a meal plan (#539): the host side of the DS
 * MealPlanDetailPage week view (DS #660). Entries may carry an explicit `day`
 * (#539's data model); the rest fall back as described below.
 */
export type MealPlanDayGroup = {
  /** The day's date, `YYYY-MM-DD` — also the group's stable key. */
  day: string;
  /** The day's entries, in plan order. Empty for a range day with none. */
  entries: MealPlanEntry[];
  /**
   * The day's totals from servings eaten: each entry's (already eaten-basis)
   * nutrition scaled by its quantity, summed. Null when no entry of the day
   * carries usable nutrition. Satiety is the prepared-weight-weighted average
   * of the contributing entries' scores (DS #660 leaves the day's satiety
   * aggregation to the host).
   */
  totals: AggregatedNutrition | null;
};

const DAY_MS = 86_400_000;

/** Whole days from `from` to `to` (both `YYYY-MM-DD`); NaN-safe. */
const dayDiff = (from: string, to: string): number =>
  Math.floor(
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) /
      DAY_MS,
  );

const addDays = (day: string, count: number): string =>
  new Date(Date.parse(`${day}T00:00:00.000Z`) + count * DAY_MS)
    .toISOString()
    .slice(0, 10);

/**
 * Fill empty columns only for sane spans: a plan's date range is a week in
 * practice, and an accidental year-long range must not mint hundreds of empty
 * columns.
 */
const MAX_FILLED_RANGE_DAYS = 31;

const sumDayTotals = (entries: MealPlanEntry[]): AggregatedNutrition | null => {
  let contributing = 0;
  let partial = false;
  const totals = {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
    sugarG: 0,
    sodiumMg: 0,
    preparedWeightG: 0,
  };
  let satietyWeightedSum = 0;
  let satietyWeight = 0;
  for (const entry of entries) {
    const nutrition = entry.nutrition;
    if (!nutrition || nutrition.status === 'unavailable') {
      partial = true;
      continue;
    }
    contributing += 1;
    if (nutrition.status !== 'ready') {
      partial = true;
    }
    const scale = entry.quantity;
    totals.calories += nutrition.calories * scale;
    totals.proteinG += nutrition.proteinG * scale;
    totals.carbsG += nutrition.carbsG * scale;
    totals.fatG += nutrition.fatG * scale;
    totals.fiberG += nutrition.fiberG * scale;
    totals.sugarG += nutrition.sugarG * scale;
    totals.sodiumMg += nutrition.sodiumMg * scale;
    totals.preparedWeightG += nutrition.preparedWeightG * scale;
    if (nutrition.satietyScore !== null && nutrition.preparedWeightG > 0) {
      satietyWeightedSum +=
        nutrition.satietyScore * nutrition.preparedWeightG * scale;
      satietyWeight += nutrition.preparedWeightG * scale;
    }
  }
  if (contributing === 0) {
    return null;
  }
  return {
    ...totals,
    satietyScore: satietyWeight > 0 ? satietyWeightedSum / satietyWeight : null,
    status: partial ? 'partial' : 'ready',
  };
};

/**
 * Group a plan's entries by day for the week view.
 *
 * - An entry with an explicit `day` groups under that day.
 * - An entry without one falls back to plan order from `startsOn`: it joins the
 *   plan's first day (dated entries on `startsOn` keep their relative order
 *   around it). The fallback deliberately does NOT invent a meals-per-day split
 *   — plans carry 1–3+ entries a day, so distributing undated entries across
 *   days would fabricate data (the rejected Option B of #539).
 * - When the plan declares a `startsOn`–`endsOn` range of at most
 *   MAX_FILLED_RANGE_DAYS, every day of the range gets a group (empty days
 *   included, so a week renders as a full calendar); dated entries outside the
 *   range still get their own groups.
 * - A plan with no day anchor at all (no entry days and no `startsOn`) returns no
 *   groups: hosts then render the flat entry list, so such a plan still renders
 *   — never an error, never an empty page.
 */
export const groupMealPlanEntriesByDay = (
  plan: MealPlanDetail,
): MealPlanDayGroup[] => {
  const byDay = new Map<string, MealPlanEntry[]>();
  const push = (day: string, entry: MealPlanEntry) => {
    const list = byDay.get(day);
    if (list) {
      list.push(entry);
    } else {
      byDay.set(day, [entry]);
    }
  };
  // Entries arrive in plan order (sortOrder); grouping preserves it
  // within each day.
  for (const entry of plan.entries) {
    const day = entry.day ?? plan.startsOn;
    if (day) {
      push(day, entry);
    }
  }
  if (byDay.size === 0) {
    return [];
  }
  if (plan.startsOn && plan.endsOn) {
    const span = dayDiff(plan.startsOn, plan.endsOn);
    if (span >= 0 && span < MAX_FILLED_RANGE_DAYS) {
      for (let offset = 0; offset <= span; offset += 1) {
        const day = addDays(plan.startsOn, offset);
        if (!byDay.has(day)) {
          byDay.set(day, []);
        }
      }
    }
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([day, entries]) => ({day, entries, totals: sumDayTotals(entries)}));
};

/**
 * The DS week view's per-day totals rows for one day group (#660): the same
 * pre-labelled `{ label, valueLabel }` rows as the weekly-totals band, composed
 * from the day's eaten totals. Returns empty rows plus no satiety label for a
 * day with no usable nutrition.
 */
export const buildMealPlanDayTotals = (
  group: MealPlanDayGroup,
): {
  dailyTotals: {label: string; valueLabel: string}[];
  satietyLabel?: string;
} => {
  const totals = group.totals;
  if (!totals) {
    return {dailyTotals: []};
  }
  return {
    dailyTotals: [
      {label: 'Calories', valueLabel: `${Math.round(totals.calories)} cal`},
      {label: 'Protein', valueLabel: `${Math.round(totals.proteinG)}g protein`},
      {label: 'Carbs', valueLabel: `${Math.round(totals.carbsG)}g carbs`},
      {
        label: 'Net carbs',
        valueLabel: `${Math.round(totals.carbsG - totals.fiberG)}g net carbs`,
      },
      {label: 'Fat', valueLabel: `${Math.round(totals.fatG)}g fat`},
    ],
    ...(totals.satietyScore !== null
      ? {satietyLabel: `Satiety ${Math.round(totals.satietyScore)}`}
      : {}),
  };
};

const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** The weekday heading for a `YYYY-MM-DD` day, e.g. "Monday". */
export const mealPlanDayLabel = (day: string): string => {
  const date = new Date(Date.parse(`${day}T00:00:00.000Z`));
  return WEEKDAY_LABELS[date.getUTCDay()] ?? '';
};

/**
 * The DS week view's view-model for a plan (DS #660), built from the day
 * groups: each day's heading (weekday), date line, mapped entries, and
 * pre-labelled totals rows. `mapEntry` is the host's own entry mapping (href
 * composition differs per platform), applied per entry in plan order. Returns
 * null when the plan has no day anchor — hosts then omit `weekView` and the DS
 * page renders its flat entry list.
 */
export const buildMealPlanWeekView = <TEntry>(
  plan: MealPlanDetail,
  mapEntry: (entry: MealPlanEntry) => TEntry,
): {
  days: {
    id: string;
    label: string;
    dateLabel: string;
    entries: TEntry[];
    dailyTotals: {label: string; valueLabel: string}[];
    satietyLabel?: string;
  }[];
} | null => {
  const groups = groupMealPlanEntriesByDay(plan);
  if (
    groups.length === 0 ||
    // An undated entry in a plan with no startsOn anchor can never be
    // grouped; returning a week view would hide it. Fall back to the
    // flat list, which contains every entry.
    plan.entries.some(entry => !entry.day && !plan.startsOn)
  ) {
    return null;
  }
  return {
    days: groups.map(group => ({
      id: group.day,
      label: mealPlanDayLabel(group.day),
      dateLabel: group.day,
      entries: group.entries.map(mapEntry),
      ...buildMealPlanDayTotals(group),
    })),
  };
};
