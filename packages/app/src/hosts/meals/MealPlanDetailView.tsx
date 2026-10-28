import type {MealPlanDetailViewProps} from '@eciperay/client';
import {formatSimpleNutrition} from '@eciperay/client';
import type {NutritionGoalFieldProgress} from '@eciperay/types';
import {
  MealPlanDetailPage,
  type MealPlanDetailPageEntry,
  type MealPlanDetailPageNutritionGoals,
} from '@spudly/ui/pages';

/**
 * The Meal plan detail screen's view (#49, Wave A): the design system's
 * MealPlanDetailPage renders the screen — plan meta, the nutrition-goals
 * section, the Shopping list / Edit actions, the flat entry list — and this
 * component is its app-side host. Everything the page must not own stays here:
 * the view-model mapping (the date range joined with " – " from the plan's raw
 * date strings, the nutrition summary composed by the app's formatter, the goal
 * rows' rounded actual / goal labels with the app's band wording, and each
 * entry's quantity meta line), in exactly the composition the hand-rolled view
 * rendered.
 *
 * Loading stays app-side, as the DS contract records: the screen keeps its
 * ScreenLoadingGate (with its delayed spinner) around this host, so the page is
 * only ever driven in its ready state here; the union's loading member serves
 * the page's standalone use. A missing plan stays on the gate — there is no
 * not-found UI, here or in the page.
 *
 * The goals section's composition mirrors NutritionGoalProgressView, which this
 * screen no longer renders (the section itself is view-modeled into the page,
 * not slotted — the app's goal view is pure presentation over this data). Rows
 * cover the three fields that view rendered — Calories, Protein, Satiety — in
 * its order; the progress type's carbs / fat fields were never rendered.
 * `nutritionGoals` is null exactly when the plan carries no goal progress, even
 * when every rendered field is unset (the old view keyed the rows-vs-hint
 * choice on the progress object, not on its fields).
 *
 * One visibility nuance rides on the DS contract: the page decides the goals
 * section's visibility itself, rendering it when the plan has goal progress or
 * a nutrition summary. The old view keyed the section on the raw nutrition
 * object, so a plan whose nutrition is present but unavailable (the formatter
 * returns no summary) with no goal progress still showed the set-goals hint
 * card. The page's `goalsSectionVisibility` prop (DS #78, @spudly/ui 1.4.0)
 * closes that gap: this host passes "shown" for exactly that case and "auto"
 * otherwise, so every case — the standalone nutrition line, the section's "Plan
 * total:" line, the hint, the set-goals link — composes identically to the old
 * view.
 */

const bandLabel = (band: NutritionGoalFieldProgress['band']): string => {
  if (band === 'under') {
    return 'Below goal';
  }
  if (band === 'over') {
    return 'Above goal';
  }
  return 'On track';
};

const goalValueLabel = (field: NutritionGoalFieldProgress): string =>
  `${Math.round(field.actual)} / ${Math.round(field.goal)} · ${bandLabel(field.band)}`;

export const MealPlanDetailView = ({
  plan,
  onEdit,
  onShoppingList,
  onMealPress,
  onRecipePress,
  onSetGoalsPress,
}: MealPlanDetailViewProps) => {
  const nutritionLabel = formatSimpleNutrition(plan.nutrition) ?? undefined;

  const progress = plan.goalProgress;
  // Row labels carry a qualifier naming what the server actually
  // compared against the daily goals (#266): `comparePlanToGoals` uses
  // the plan's per-day average only when the plan has a valid date
  // range (the server sets `nutrition.perDay` only then — plan dates
  // are optional); with no valid range `perDay` is null and it falls
  // back to the whole-plan total. So the qualifier is "(per-day avg)"
  // exactly when `perDay` is present and "(plan total)" otherwise —
  // labelling the fallback total a daily average would be wrong for
  // undated plans. The DS page has no caption slot for the section, so
  // the label is the lever.
  //
  // Satiety is the exception: it carries neither qualifier. The server
  // computes it from aggregated nutrient ratios (protein share, energy
  // density, fiber per calorie — see `satietyForTotals` /
  // `calculateSatiety`), all scale-invariant, so the per-day figure and
  // the whole-plan figure are the same score and changing the plan
  // length does not change it. It is a plan-wide score, not an average
  // or a total (CodeRabbit on #272).
  const progressQualifier = plan.nutrition?.perDay
    ? '(per-day avg)'
    : '(plan total)';
  const nutritionGoals: MealPlanDetailPageNutritionGoals | null = progress
    ? {
        rows: [
          ...(progress.calories
            ? [
                {
                  label: `Calories ${progressQualifier}`,
                  valueLabel: goalValueLabel(progress.calories),
                },
              ]
            : []),
          ...(progress.proteinG
            ? [
                {
                  label: `Protein ${progressQualifier}`,
                  valueLabel: goalValueLabel(progress.proteinG),
                },
              ]
            : []),
          ...(progress.satietyScore
            ? [
                {
                  label: 'Satiety (plan-wide score)',
                  valueLabel: goalValueLabel(progress.satietyScore),
                },
              ]
            : []),
        ],
      }
    : null;

  // DS #78: force the goals section (with its set-goals hint) for the one
  // case the page's own rule misses — nutrition present but unavailable (no
  // summary) and no goal progress; "auto" keeps the page's rule elsewhere.
  const goalsSectionVisibility: 'shown' | 'auto' =
    plan.nutrition !== null &&
    plan.nutrition.status === 'unavailable' &&
    progress === null
      ? 'shown'
      : 'auto';

  const entries: MealPlanDetailPageEntry[] = plan.entries.map(entry => {
    const entryNutrition = formatSimpleNutrition(entry.nutrition);
    const nutritionSuffix = entryNutrition ? ` · ${entryNutrition}` : '';
    if (entry.type === 'meal') {
      return {
        id: entry.id,
        kind: 'meal',
        targetId: entry.mealId,
        title: entry.title,
        subtitle: `Qty ${entry.quantity} · ${entry.memberCount} recipes${nutritionSuffix}`,
      };
    }
    return {
      id: entry.id,
      kind: 'recipe',
      targetId: entry.recipeId,
      title: entry.title,
      subtitle: `Qty ${entry.quantity} · ${entry.servings} servings${nutritionSuffix}`,
      isUnavailable: entry.accessLost,
    };
  });

  return (
    <MealPlanDetailPage
      state="ready"
      title={plan.title}
      notes={plan.notes}
      dateRangeLabel={
        plan.startsOn && plan.endsOn
          ? `${plan.startsOn} – ${plan.endsOn}`
          : undefined
      }
      nutritionLabel={nutritionLabel}
      nutritionGoals={nutritionGoals}
      goalsSectionVisibility={goalsSectionVisibility}
      onSetGoalsPress={onSetGoalsPress}
      onShoppingListPress={onShoppingList}
      onEditPress={onEdit}
      entries={entries}
      onMealPress={onMealPress}
      onRecipePress={onRecipePress}
    />
  );
};
