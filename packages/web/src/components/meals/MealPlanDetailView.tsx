import type {MealPlanDetailViewProps} from '@eciperay/client';
import {formatSimpleNutrition} from '@eciperay/client';

import {PageTitle} from '../ui/PageTitle.js';
import {PrimaryButton} from '../ui/PrimaryButton.js';
import {ScreenScroll} from '../ui/ScreenScroll.js';
import {SecondaryButton} from '../ui/SecondaryButton.js';
import {SectionCard} from '../ui/SectionCard.js';

import {NutritionGoalProgressView} from './NutritionGoalProgressView.js';

// Page-view migration (#49, Wave A): the app mirror no longer renders
// its own detail — it hosts the design system's MealPlanDetailPage
// (@spudly/ui/pages) and keeps only the app-side composition (the date
// range joined from the plan's raw date strings, the nutrition summary
// and entry meta lines composed by the shared formatter, and the goal
// rows' rounded labels with the app's band wording). This web mirror
// deliberately keeps its DOM implementation; converging web onto the
// DS page is a separate decision. Two composition notes from the app
// rewire: the app's screen keeps its delayed-spinner loading gate, so
// the app host drives the page only in its ready state; and the page
// renders the goals section when the plan has goal progress or a
// nutrition summary, where this mirror (like the old app view) keys
// the section on the raw nutrition object — so for a plan whose
// nutrition is present but unavailable with no goal progress, web
// still shows the set-goals hint card and the app no longer does.
export const MealPlanDetailView = ({
  plan,
  onEdit,
  onShoppingList,
  onMealPress,
  onRecipePress,
  onSetGoalsPress,
}: MealPlanDetailViewProps) => (
  <ScreenScroll>
    <PageTitle spacing="section">{plan.title}</PageTitle>
    {plan.notes ? (
      <p className="text-muted mbe-4 text-sm">{plan.notes}</p>
    ) : null}
    {plan.startsOn && plan.endsOn ? (
      <p className="text-muted mbe-4 text-sm">
        {plan.startsOn} – {plan.endsOn}
      </p>
    ) : null}
    {formatSimpleNutrition(plan.nutrition) ? (
      <p className="mbe-4 text-sm text-gray-800">
        {formatSimpleNutrition(plan.nutrition)}
      </p>
    ) : null}
    <NutritionGoalProgressView
      progress={plan.goalProgress}
      nutrition={plan.nutrition}
      onSetGoalsPress={onSetGoalsPress}
    />
    <div className="mbe-6 flex flex-wrap gap-3">
      <PrimaryButton
        label="Shopping list"
        onPress={onShoppingList}
      />
      <SecondaryButton
        label="Edit"
        onPress={onEdit}
      />
    </div>
    <SectionCard title="Entries">
      <ul className="divide-y divide-gray-100">
        {plan.entries.map(entry => (
          <li key={entry.id}>
            {entry.type === 'meal' ? (
              <button
                type="button"
                className="py-3 text-start inline-full"
                onClick={() => {
                  onMealPress(entry.mealId);
                }}
              >
                <p className="text-base font-medium text-gray-900">
                  Meal · {entry.title}
                </p>
                <p className="text-muted text-sm">
                  Qty {entry.quantity} · {entry.memberCount} recipes
                  {formatSimpleNutrition(entry.nutrition)
                    ? ` · ${formatSimpleNutrition(entry.nutrition)}`
                    : ''}
                </p>
              </button>
            ) : (
              <button
                type="button"
                className="py-3 text-start inline-full"
                disabled={entry.accessLost}
                onClick={() => {
                  onRecipePress(entry.recipeId);
                }}
              >
                <p className="text-base font-medium text-gray-900">
                  Recipe · {entry.title}
                  {entry.accessLost ? ' (unavailable)' : ''}
                </p>
                <p className="text-muted text-sm">
                  Qty {entry.quantity} · {entry.servings} servings
                  {formatSimpleNutrition(entry.nutrition)
                    ? ` · ${formatSimpleNutrition(entry.nutrition)}`
                    : ''}
                </p>
              </button>
            )}
          </li>
        ))}
      </ul>
    </SectionCard>
  </ScreenScroll>
);
