import type {MealsHubViewProps} from '@eciperay/client';
import {formatSimpleNutrition} from '@eciperay/client';

import {InlineLoadingIndicator} from '../InlineLoadingIndicator.js';
import {EmptyMessage} from '../ui/EmptyMessage.js';
import {PageTitle} from '../ui/PageTitle.js';
import {PrimaryButton} from '../ui/PrimaryButton.js';
import {ScreenScroll} from '../ui/ScreenScroll.js';
import {TabBar} from '../ui/TabBar.js';
import {TextLinkButton} from '../ui/TextLinkButton.js';

export const MealsHubView = ({
  activeTab,
  onSelectTab,
  meals,
  plans,
  isLoading,
  onCreateMeal,
  onCreatePlan,
  onMealPress,
  onPlanPress,
  onDeleteMeal,
  onDeletePlan,
}: MealsHubViewProps) => (
  <ScreenScroll>
    <PageTitle spacing="section">Meals</PageTitle>
    <TabBar
      tabs={[
        {key: 'meals', label: 'Meals'},
        {key: 'plans', label: 'Meal plans'},
      ]}
      activeTab={activeTab}
      onTabChange={tab => {
        onSelectTab(tab as MealsHubViewProps['activeTab']);
      }}
    />
    <div className="my-4">
      <PrimaryButton
        label={activeTab === 'meals' ? 'New meal' : 'New meal plan'}
        onPress={activeTab === 'meals' ? onCreateMeal : onCreatePlan}
      />
    </div>
    {isLoading ? (
      <InlineLoadingIndicator loading />
    ) : activeTab === 'meals' ? (
      meals.length === 0 ? (
        <EmptyMessage>No meals yet.</EmptyMessage>
      ) : (
        <ul className="space-y-2">
          {meals.map(meal => (
            <li
              key={meal.id}
              className="ui-thumbnail-list-card flex items-center"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-start"
                onClick={() => {
                  onMealPress(meal.id);
                }}
              >
                <p className="text-base font-semibold text-gray-900">
                  {meal.title}
                </p>
                <p className="text-muted text-sm">
                  {meal.memberCount} recipe
                  {meal.memberCount === 1 ? '' : 's'}
                  {formatSimpleNutrition(meal.nutrition)
                    ? ` · ${formatSimpleNutrition(meal.nutrition)}`
                    : ''}
                </p>
              </button>
              <TextLinkButton
                label="Delete"
                onPress={() => {
                  onDeleteMeal(meal.id);
                }}
              />
            </li>
          ))}
        </ul>
      )
    ) : plans.length === 0 ? (
      <EmptyMessage>No meal plans yet.</EmptyMessage>
    ) : (
      <ul className="space-y-2">
        {plans.map(plan => (
          <li
            key={plan.id}
            className="ui-thumbnail-list-card flex items-center"
          >
            <button
              type="button"
              className="min-w-0 flex-1 text-start"
              onClick={() => {
                onPlanPress(plan.id);
              }}
            >
              <p className="text-base font-semibold text-gray-900">
                {plan.title}
              </p>
              <p className="text-muted text-sm">
                {plan.entryCount} entr
                {plan.entryCount === 1 ? 'y' : 'ies'}
                {plan.startsOn && plan.endsOn
                  ? ` · ${plan.startsOn} – ${plan.endsOn}`
                  : ''}
                {formatSimpleNutrition(plan.nutrition)
                  ? ` · ${formatSimpleNutrition(plan.nutrition)}`
                  : ''}
              </p>
            </button>
            <TextLinkButton
              label="Delete"
              onPress={() => {
                onDeletePlan(plan.id);
              }}
            />
          </li>
        ))}
      </ul>
    )}
  </ScreenScroll>
);
