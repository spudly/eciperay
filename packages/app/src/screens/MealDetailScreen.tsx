import {
  formatSimpleNutrition,
  netCarbsG,
  queryKeys,
} from '@eciperay/client';
import type {RecipeNutritionSummary} from '@eciperay/types';
import type {I18n} from '@lingui/core';
import {useLingui} from '@lingui/react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {MealDetailPage} from '@spudly/ui';
import {useQuery} from '@tanstack/react-query';

import {ScreenLoadingGate} from '../components/ScreenLoadingGate';
import {eciperay} from '../lib/api';
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
  i18n: I18n,
  summary: RecipeNutritionSummary,
  scale = 1,
): string | null => {
  const parts: string[] = [];
  if (summary.calories !== null) {
    parts.push(
      i18n._({
        id: 'mealDetail.nutritionCalories',
        message: '{value} cal',
        values: {value: Math.round(summary.calories * scale)},
      }),
    );
  }
  if (summary.proteinG !== null) {
    parts.push(
      i18n._({
        id: 'mealDetail.nutritionProtein',
        message: '{value}g protein',
        values: {value: Math.round(summary.proteinG * scale)},
      }),
    );
  }
  if (summary.carbsG !== null) {
    parts.push(
      i18n._({
        id: 'mealDetail.nutritionCarbs',
        message: '{value}g carbs',
        values: {value: Math.round(summary.carbsG * scale)},
      }),
    );
    // Net carbs beside total carbs (#613); omitted when fiber is unknown.
    const net = netCarbsG(summary);
    if (net !== null) {
      parts.push(
        i18n._({
          id: 'mealDetail.nutritionNetCarbs',
          message: '{value}g net carbs',
          values: {value: Math.round(net * scale)},
        }),
      );
    }
  }
  if (summary.fatG !== null) {
    parts.push(
      i18n._({
        id: 'mealDetail.nutritionFat',
        message: '{value}g fat',
        values: {value: Math.round(summary.fatG * scale)},
      }),
    );
  }
  if (summary.satietyScore !== null) {
    parts.push(
      i18n._({
        id: 'mealDetail.nutritionSatiety',
        message: 'satiety {value}',
        values: {value: Math.round(summary.satietyScore)},
      }),
    );
  }
  return parts.length > 0 ? parts.join(' · ') : null;
};

const servingsLabel = (
  i18n: I18n,
  servingsToCook: number,
  servingsToEat: number,
): string =>
  i18n._({
    id: 'mealDetail.servingsLabel',
    message: 'Servings to cook: {cook} · Servings to eat: {eat}',
    values: {cook: servingsToCook, eat: servingsToEat},
  });

export const MealDetailScreen = ({route}: Props) => {
  const {i18n} = useLingui();
  const {mealId} = route.params;

  const {data: meal, isLoading} = useQuery({
    queryKey: queryKeys.meal(mealId),
    queryFn: () => eciperay.meals.get(mealId),
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
            subtitle: `${servingsLabel(i18n, member.servingsToCook, member.servingsToEat)}${
              formatMemberNutrition(i18n, member)
                ? ` · ${formatMemberNutrition(i18n, member)}`
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
            // The row's nutrition is what the owner eats (#363): the
            // per-serving macros scale by servings-to-eat.
            const nutritionLabel = formatMemberNutrition(
              i18n,
              ingredient,
              ingredient.servingsToEat,
            );
            return {
              id: `ingredient-${ingredient.sortOrder}-${index}`,
              name: ingredient.name,
              subtitle: [
                quantityLabel,
                servingsLabel(
                  i18n,
                  ingredient.servingsToCook,
                  ingredient.servingsToEat,
                ),
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
