import type {MealsHubViewProps} from '@eciperay/client';
import {formatSimpleNutrition} from '@eciperay/client';
import {Pressable, Text, View} from 'react-native';

import {InlineLoadingIndicator} from '../InlineLoadingIndicator';
import {EmptyMessage} from '../ui/EmptyMessage';
import {PageTitle} from '../ui/PageTitle';
import {PrimaryButton} from '../ui/PrimaryButton';
import {ScreenScroll} from '../ui/ScreenScroll';
import {TabBar} from '../ui/TabBar';
import {TextLinkButton} from '../ui/TextLinkButton';

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
    <View className="my-4">
      <PrimaryButton
        label={activeTab === 'meals' ? 'New meal' : 'New meal plan'}
        onPress={activeTab === 'meals' ? onCreateMeal : onCreatePlan}
      />
    </View>
    {isLoading ? (
      <InlineLoadingIndicator loading />
    ) : activeTab === 'meals' ? (
      meals.length === 0 ? (
        <EmptyMessage>No meals yet.</EmptyMessage>
      ) : (
        <View className="gap-2">
          {meals.map(meal => (
            <View
              key={meal.id}
              className="ui-thumbnail-list-card flex-row items-center"
            >
              <Pressable
                className="min-w-0 flex-1"
                onPress={() => {
                  onMealPress(meal.id);
                }}
              >
                <Text className="text-base font-semibold text-gray-900">
                  {meal.title}
                </Text>
                <Text className="text-muted text-sm">
                  {meal.memberCount} recipe
                  {meal.memberCount === 1 ? '' : 's'}
                  {formatSimpleNutrition(meal.nutrition)
                    ? ` · ${formatSimpleNutrition(meal.nutrition)}`
                    : ''}
                </Text>
              </Pressable>
              <TextLinkButton
                label="Delete"
                onPress={() => {
                  onDeleteMeal(meal.id);
                }}
              />
            </View>
          ))}
        </View>
      )
    ) : plans.length === 0 ? (
      <EmptyMessage>No meal plans yet.</EmptyMessage>
    ) : (
      <View className="gap-2">
        {plans.map(plan => (
          <View
            key={plan.id}
            className="ui-thumbnail-list-card flex-row items-center"
          >
            <Pressable
              className="min-w-0 flex-1"
              onPress={() => {
                onPlanPress(plan.id);
              }}
            >
              <Text className="text-base font-semibold text-gray-900">
                {plan.title}
              </Text>
              <Text className="text-muted text-sm">
                {plan.entryCount} entr
                {plan.entryCount === 1 ? 'y' : 'ies'}
                {plan.startsOn && plan.endsOn
                  ? ` · ${plan.startsOn} – ${plan.endsOn}`
                  : ''}
                {formatSimpleNutrition(plan.nutrition)
                  ? ` · ${formatSimpleNutrition(plan.nutrition)}`
                  : ''}
              </Text>
            </Pressable>
            <TextLinkButton
              label="Delete"
              onPress={() => {
                onDeletePlan(plan.id);
              }}
            />
          </View>
        ))}
      </View>
    )}
  </ScreenScroll>
);
