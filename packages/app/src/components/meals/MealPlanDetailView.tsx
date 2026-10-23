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
 * screen no longer renders (it remains a showcased component; the section
 * itself is view-modeled into the page, not slotted — the app's goal view is
 * pure presentation over this data). Rows cover the three fields that view
 * rendered — Calories, Protein, Satiety — in its order; the progress type's
 * carbs / fat fields were never rendered. `nutritionGoals` is null exactly when
 * the plan carries no goal progress, even when every rendered field is unset
 * (the old view keyed the rows-vs-hint choice on the progress object, not on
 * its fields).
 *
 * One visibility nuance rides on the DS contract: the page renders the goals
 * section when the plan has goal progress or a nutrition summary. The old view
 * keyed the section on the raw nutrition object, so a plan whose nutrition is
 * present but unavailable (the formatter returns no summary) with no goal
 * progress still showed the set-goals hint card; the page has no encoding for
 * that case and renders no section. Every other case — the standalone nutrition
 * line, the section's "Plan total:" line, the hint, the set-goals link —
 * composes identically.
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
  const nutritionGoals: MealPlanDetailPageNutritionGoals | null = progress
    ? {
        rows: [
          ...(progress.calories
            ? [
                {
                  label: 'Calories',
                  valueLabel: goalValueLabel(progress.calories),
                },
              ]
            : []),
          ...(progress.proteinG
            ? [
                {
                  label: 'Protein',
                  valueLabel: goalValueLabel(progress.proteinG),
                },
              ]
            : []),
          ...(progress.satietyScore
            ? [
                {
                  label: 'Satiety',
                  valueLabel: goalValueLabel(progress.satietyScore),
                },
              ]
            : []),
        ],
      }
    : null;

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
      onSetGoalsPress={onSetGoalsPress}
      onShoppingListPress={onShoppingList}
      onEditPress={onEdit}
      entries={entries}
      onMealPress={onMealPress}
      onRecipePress={onRecipePress}
    />
  );
};
