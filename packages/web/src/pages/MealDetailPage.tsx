import {formatSimpleNutrition, queryKeys} from '@eciperay/client';
import type {MealRecipeMember} from '@eciperay/types';
import {MealDetailPage as MealDetailPageView} from '@spudly/ui/pages';
import {useQuery} from '@tanstack/react-query';
import {useParams} from 'react-router-dom';

import {ScreenLoadingGate} from '../components/ScreenLoadingGate.js';
import {eciperay} from '../lib/api.js';

/**
 * One member row's nutrition line, composed host-side for the DS page: the
 * calories / protein / satiety parts the retired web view rendered inline.
 * The string crosses the @spudly/ui/pages boundary pre-composed inside the
 * member subtitle (the RecipesPage subtitle precedent): the rounding is
 * the host's, so the page only renders it. Mirrors the app screen's
 * composition.
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

export const MealDetailPage = () => {
  const {mealId = ''} = useParams();

  const {data: meal, isLoading} = useQuery({
    queryKey: queryKeys.meal(mealId),
    queryFn: () => eciperay.meals.get(mealId),
    enabled: mealId.length > 0,
  });

  return (
    <ScreenLoadingGate pending={isLoading || !meal}>
      {meal ? (
        <MealDetailPageView
          title={meal.title}
          notes={meal.notes}
          nutritionLabel={formatSimpleNutrition(meal.nutrition)}
          members={meal.members.map(member => ({
            recipeId: member.recipeId,
            href: `/recipes/${member.recipeId}`,
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
          cookHref={`/meals/${mealId}/cook`}
          editHref={`/meals/${mealId}/edit`}
        />
      ) : null}
    </ScreenLoadingGate>
  );
};
