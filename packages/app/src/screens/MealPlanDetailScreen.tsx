import {queryKeys} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';

import {MealPlanDetailView} from '../hosts/meals/MealPlanDetailView';
import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {api} from '../lib/api';
import {
  mealHref,
  mealPlanEditHref,
  profileHref,
  recipeHref,
  shoppingListHref,
} from '../lib/deepLinks';
import type {MealsStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealPlanDetail'>;

// Navigation crosses into the DS page as deep-link hrefs (#248,
// @spudly/ui 1.15.0), so this screen no longer takes navigation
// callbacks through the view — it composes the destinations.
export const MealPlanDetailScreen = ({route}: Props) => {
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
          editHref={mealPlanEditHref(planId)}
          shoppingListHref={shoppingListHref(planId)}
          goalsHref={profileHref}
          entryHref={(kind, targetId) =>
            kind === 'meal' ? mealHref(targetId) : recipeHref(targetId)
          }
        />
      ) : null}
    </ScreenLoadingGate>
  );
};
