import type {MealPlanDetailViewProps} from '@eciperay/client';
import {formatSimpleNutrition} from '@eciperay/client';
import {Text as DsText, tokens} from '@spudly/ui';
import {Pressable} from 'react-native';
import {XStack, YStack} from 'tamagui';

import {PageTitle} from '../ui/PageTitle';
import {PrimaryButton} from '../ui/PrimaryButton';
import {ScreenScroll} from '../ui/ScreenScroll';
import {SecondaryButton} from '../ui/SecondaryButton';
import {SectionCard} from '../ui/SectionCard';

import {NutritionGoalProgressView} from './NutritionGoalProgressView';

/* Pressable rows keep the RN Pressable with a token-valued style (the
   IngredientsTab pressable precedent): py-3 row padding. */
const rowStyle = {paddingVertical: tokens.spacing[3]} as const;

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
      <DsText
        color="$textMuted"
        marginBlockEnd="$4"
        fontSize={tokens.typography.fontSize.sm}
      >
        {plan.notes}
      </DsText>
    ) : null}
    {plan.startsOn && plan.endsOn ? (
      <DsText
        color="$textMuted"
        marginBlockEnd="$4"
        fontSize={tokens.typography.fontSize.sm}
      >
        {plan.startsOn} – {plan.endsOn}
      </DsText>
    ) : null}
    {formatSimpleNutrition(plan.nutrition) ? (
      <DsText
        marginBlockEnd="$4"
        fontSize={tokens.typography.fontSize.sm}
        color={tokens.colors.gray.gray9}
      >
        {formatSimpleNutrition(plan.nutrition)}
      </DsText>
    ) : null}
    <NutritionGoalProgressView
      progress={plan.goalProgress}
      nutrition={plan.nutrition}
      onSetGoalsPress={onSetGoalsPress}
    />
    <XStack
      marginBlockEnd="$6"
      flexWrap="wrap"
      gap="$3"
    >
      <PrimaryButton
        label="Shopping list"
        onPress={onShoppingList}
      />
      <SecondaryButton
        label="Edit"
        onPress={onEdit}
      />
    </XStack>
    <SectionCard title="Entries">
      {plan.entries.map(entry => (
        <YStack
          key={entry.id}
          borderBottomWidth={1}
          borderBottomColor={tokens.colors.gray.gray2}
        >
          {entry.type === 'meal' ? (
            <Pressable
              style={rowStyle}
              onPress={() => {
                onMealPress(entry.mealId);
              }}
            >
              <DsText
                fontSize={tokens.typography.fontSize.md}
                fontWeight={tokens.typography.fontWeight.medium}
                color={tokens.colors.gray.gray10}
              >
                Meal · {entry.title}
              </DsText>
              <DsText
                color="$textMuted"
                fontSize={tokens.typography.fontSize.sm}
              >
                Qty {entry.quantity} · {entry.memberCount} recipes
                {formatSimpleNutrition(entry.nutrition)
                  ? ` · ${formatSimpleNutrition(entry.nutrition)}`
                  : ''}
              </DsText>
            </Pressable>
          ) : (
            <Pressable
              style={rowStyle}
              disabled={entry.accessLost}
              onPress={() => {
                onRecipePress(entry.recipeId);
              }}
            >
              <DsText
                fontSize={tokens.typography.fontSize.md}
                fontWeight={tokens.typography.fontWeight.medium}
                color={tokens.colors.gray.gray10}
              >
                Recipe · {entry.title}
                {entry.accessLost ? ' (unavailable)' : ''}
              </DsText>
              <DsText
                color="$textMuted"
                fontSize={tokens.typography.fontSize.sm}
              >
                Qty {entry.quantity} · {entry.servings} servings
                {formatSimpleNutrition(entry.nutrition)
                  ? ` · ${formatSimpleNutrition(entry.nutrition)}`
                  : ''}
              </DsText>
            </Pressable>
          )}
        </YStack>
      ))}
    </SectionCard>
  </ScreenScroll>
);
