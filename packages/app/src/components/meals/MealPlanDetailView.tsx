import type {MealPlanDetailViewProps} from '@eciperay/client';
import {formatSimpleNutrition} from '@eciperay/client';
import {Pressable, Text, View} from 'react-native';

import {PageTitle} from '../ui/PageTitle';
import {PrimaryButton} from '../ui/PrimaryButton';
import {ScreenScroll} from '../ui/ScreenScroll';
import {SecondaryButton} from '../ui/SecondaryButton';
import {SectionCard} from '../ui/SectionCard';

import {NutritionGoalProgressView} from './NutritionGoalProgressView';

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
      <Text className="text-muted mbe-4 text-sm">{plan.notes}</Text>
    ) : null}
    {plan.startsOn && plan.endsOn ? (
      <Text className="text-muted mbe-4 text-sm">
        {plan.startsOn} – {plan.endsOn}
      </Text>
    ) : null}
    {formatSimpleNutrition(plan.nutrition) ? (
      <Text className="mbe-4 text-sm text-gray-800">
        {formatSimpleNutrition(plan.nutrition)}
      </Text>
    ) : null}
    <NutritionGoalProgressView
      progress={plan.goalProgress}
      nutrition={plan.nutrition}
      onSetGoalsPress={onSetGoalsPress}
    />
    <View className="mbe-6 flex-row flex-wrap gap-3">
      <PrimaryButton
        label="Shopping list"
        onPress={onShoppingList}
      />
      <SecondaryButton
        label="Edit"
        onPress={onEdit}
      />
    </View>
    <SectionCard title="Entries">
      {plan.entries.map(entry => (
        <View
          key={entry.id}
          className="border-be border-gray-100"
        >
          {entry.type === 'meal' ? (
            <Pressable
              className="py-3"
              onPress={() => {
                onMealPress(entry.mealId);
              }}
            >
              <Text className="text-base font-medium text-gray-900">
                Meal · {entry.title}
              </Text>
              <Text className="text-muted text-sm">
                Qty {entry.quantity} · {entry.memberCount} recipes
                {formatSimpleNutrition(entry.nutrition)
                  ? ` · ${formatSimpleNutrition(entry.nutrition)}`
                  : ''}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              className="py-3"
              disabled={entry.accessLost}
              onPress={() => {
                onRecipePress(entry.recipeId);
              }}
            >
              <Text className="text-base font-medium text-gray-900">
                Recipe · {entry.title}
                {entry.accessLost ? ' (unavailable)' : ''}
              </Text>
              <Text className="text-muted text-sm">
                Qty {entry.quantity} · {entry.servings} servings
                {formatSimpleNutrition(entry.nutrition)
                  ? ` · ${formatSimpleNutrition(entry.nutrition)}`
                  : ''}
              </Text>
            </Pressable>
          )}
        </View>
      ))}
    </SectionCard>
  </ScreenScroll>
);
