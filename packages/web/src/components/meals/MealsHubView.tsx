import type {MealsHubViewProps} from '@eciperay/client';
import {formatSimpleNutrition} from '@eciperay/client';
import {Card} from '@spudly/ui';
import {XStack, YStack} from 'tamagui';

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
        <YStack gap="$2">
          {meals.map(meal => (
            <Card
              key={meal.id}
              marginBottom="$3"
              padding="$4"
            >
              <XStack alignItems="center" gap="$3">
              <button
                type="button"
                className="flex-1 text-start min-inline-0"
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
              </XStack>
            </Card>
          ))}
        </YStack>
      )
    ) : plans.length === 0 ? (
      <EmptyMessage>No meal plans yet.</EmptyMessage>
    ) : (
      <YStack gap="$2">
        {plans.map(plan => (
          <Card
            key={plan.id}
            marginBottom="$3"
            padding="$4"
          >
            <XStack alignItems="center" gap="$3">
            <button
              type="button"
              className="flex-1 text-start min-inline-0"
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
              </XStack>
            </Card>
          ))}
        </YStack>
      )}
  </ScreenScroll>
);
