import {queryKeys} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';

import {MealPlanDetailView} from '../components/meals/MealPlanDetailView';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {api} from '../lib/api';
import type {MealsStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealPlanDetail'>;

export const MealPlanDetailScreen = ({route, navigation}: Props) => {
  const {planId} = route.params;

  const {data: plan, isLoading} = useQuery({
    queryKey: queryKeys.mealPlan(planId),
    queryFn: () => api.mealPlans.get(planId),
  });

  return (
    <ScreenLoadingGate pending={isLoading || !plan}>
      {plan ? (
        <MealPlanDetailView
          plan={plan}
          onEdit={() => {
            navigation.navigate('MealPlanEdit', {planId});
          }}
          onShoppingList={() => {
            navigation.navigate('ShoppingList', {planId});
          }}
          onMealPress={mealId => {
            navigation.navigate('MealDetail', {mealId});
          }}
          onRecipePress={recipeId => {
            navigation
              .getParent()
              ?.navigate('Recipes', {
                screen: 'RecipeDetail',
                params: {recipeId},
              });
          }}
          onSetGoalsPress={() => {
            navigation
              .getParent()
              ?.navigate('Profile', {screen: 'ProfileHome'});
          }}
        />
      ) : null}
    </ScreenLoadingGate>
  );
};
