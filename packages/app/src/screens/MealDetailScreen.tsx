import {formatSimpleNutrition, queryKeys} from '@eciperay/client';
import type {MealRecipeMember} from '@eciperay/types';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {MealDetailPage} from '@spudly/ui/pages';
import {useQuery} from '@tanstack/react-query';

import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {api} from '../lib/api';
import {mealCookHref, mealEditHref, recipeHref} from '../lib/deepLinks';
import type {MealsStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealDetail'>;

/**
 * One member row's nutrition line, composed screen-side for the DS page: the
 * calories / protein / satiety parts the app view rendered inline. The string
 * crosses the @spudly/ui/pages boundary pre-composed inside the member subtitle
 * (the RecipesPage subtitle precedent): the rounding is the app's, so the page
 * only renders it.
 */
const formatMemberNutrition = (member: MealRecipeMember): string | null => {
  const parts: string[] = [];
  if (member.calories !== null) {
    parts.push(`${Math.round(member.calories)} cal`);
  }
  if (member.proteinG !== null) {
    parts.push(`${Math.round(member.proteinG)}g protein`);
  }
  if (member.satietyScore !== null) {
    parts.push(`satiety ${Math.round(member.satietyScore)}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
};

export const MealDetailScreen = ({route}: Props) => {
  const {mealId} = route.params;

  const {data: meal, isLoading} = useQuery({
    queryKey: queryKeys.meal(mealId),
    queryFn: () => api.meals.get(mealId),
  });

  return (
    <ScreenLoadingGate pending={isLoading || !meal}>
      {meal ? (
        <MealDetailPage
          title={meal.title}
          notes={meal.notes}
          nutritionLabel={formatSimpleNutrition(meal.nutrition)}
          members={meal.members.map(member => ({
            recipeId: member.recipeId,
            href: recipeHref(member.recipeId),
            title: member.title,
            subtitle: `${member.servings} serving${
              member.servings === 1 ? '' : 's'
            }${
              formatMemberNutrition(member)
                ? ` · ${formatMemberNutrition(member)}`
                : ''
            }`,
            isUnavailable: member.accessLost,
          }))}
          cookHref={mealCookHref(mealId)}
          editHref={mealEditHref(mealId)}
        />
      ) : null}
    </ScreenLoadingGate>
  );
};
