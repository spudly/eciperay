import {formatSimpleNutrition, queryKeys} from '@eciperay/client';
import type {RecipeNutritionSummary} from '@eciperay/types';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {MealDetailPage} from '@spudly/ui';
import {useQuery} from '@tanstack/react-query';

import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {api} from '../lib/api';
import {mealCookHref, mealEditHref, recipeHref} from '../lib/deepLinks';
import type {MealsStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealDetail'>;

/**
 * One member row's nutrition line, composed screen-side for the DS page: the
 * calories / protein / carbs / fat / satiety parts the app view rendered
 * inline. The string crosses the @spudly/ui/pages boundary pre-composed inside
 * the member subtitle (the RecipesPage subtitle precedent): the rounding is the
 * app's, so the page only renders it.
 */
const formatMemberNutrition = (
  summary: RecipeNutritionSummary,
  scale = 1,
): string | null => {
  const parts: string[] = [];
  if (summary.calories !== null) {
    parts.push(`${Math.round(summary.calories * scale)} cal`);
  }
  if (summary.proteinG !== null) {
    parts.push(`${Math.round(summary.proteinG * scale)}g protein`);
  }
  if (summary.carbsG !== null) {
    parts.push(`${Math.round(summary.carbsG * scale)}g carbs`);
  }
  if (summary.fatG !== null) {
    parts.push(`${Math.round(summary.fatG * scale)}g fat`);
  }
  if (summary.satietyScore !== null) {
    parts.push(`satiety ${Math.round(summary.satietyScore)}`);
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
            href: recipeHref({id: member.recipeId, title: member.title}),
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
          ingredients={(meal.ingredients ?? []).map((ingredient, index) => {
            // A direct ingredient's stored nutrition is per serving, so
            // its row shows the entry's total contribution (scaled by
            // its servings), like each member recipe's row — the web
            // MealDetailPage mapping (#362 tranche 2), mirrored here.
            const quantityLabel =
              ingredient.quantity === null
                ? null
                : `${ingredient.quantity}${
                    ingredient.unit ? ` ${ingredient.unit}` : ''
                  }`;
            const nutritionLabel = formatMemberNutrition(
              ingredient,
              ingredient.servings,
            );
            return {
              id: `ingredient-${ingredient.sortOrder}-${index}`,
              name: ingredient.name,
              subtitle: [
                quantityLabel,
                `${ingredient.servings} serving${
                  ingredient.servings === 1 ? '' : 's'
                }`,
                nutritionLabel,
              ]
                .filter(Boolean)
                .join(' · '),
            };
          })}
          cookHref={mealCookHref(mealId)}
          editHref={mealEditHref(mealId)}
        />
      ) : null}
    </ScreenLoadingGate>
  );
};
