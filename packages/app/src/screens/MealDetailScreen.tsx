import {queryKeys} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';

import {MealDetailView} from '../components/meals/MealDetailView';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {api} from '../lib/api';
import type {MealsStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealDetail'>;

export const MealDetailScreen = ({route, navigation}: Props) => {
  const {mealId} = route.params;

  const {data: meal, isLoading} = useQuery({
    queryKey: queryKeys.meal(mealId),
    queryFn: () => api.meals.get(mealId),
  });

  return (
    <ScreenLoadingGate pending={isLoading || !meal}>
      {meal ? (
        <MealDetailView
          meal={meal}
          onEdit={() => {
            navigation.navigate('MealEdit', {mealId});
          }}
          onCook={() => {
            navigation.navigate('MealCookingMode', {mealId});
          }}
          onRecipePress={recipeId => {
            navigation
              .getParent()
              ?.navigate('Recipes', {
                screen: 'RecipeDetail',
                params: {recipeId},
              });
          }}
        />
      ) : null}
    </ScreenLoadingGate>
  );
};
