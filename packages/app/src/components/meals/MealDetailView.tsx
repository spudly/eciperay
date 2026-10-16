import type {MealDetailViewProps} from '@eciperay/client';
import {formatSimpleNutrition} from '@eciperay/client';
import {Text as DsText, tokens} from '@spudly/ui';
import type {MealRecipeMember} from '@eciperay/types';
import {Pressable} from 'react-native';
import {XStack} from 'tamagui';

import {PageTitle} from '../ui/PageTitle';
import {PrimaryButton} from '../ui/PrimaryButton';
import {ScreenScroll} from '../ui/ScreenScroll';
import {SecondaryButton} from '../ui/SecondaryButton';
import {SectionCard} from '../ui/SectionCard';

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

/* Pressable rows keep the RN Pressable with token-valued styles (the
   IngredientsTab pressable precedent): border-be gray-100 (ramp step 2),
   py-3 row padding. */
const memberRowStyle = {
  borderBottomWidth: 1,
  borderBottomColor: tokens.colors.gray.gray2,
  paddingVertical: tokens.spacing[3],
} as const;

export const MealDetailView = ({
  meal,
  onEdit,
  onCook,
  onRecipePress,
}: MealDetailViewProps) => (
  <ScreenScroll>
    <PageTitle spacing="section">{meal.title}</PageTitle>
    {meal.notes ? (
      <DsText
        color="$textMuted"
        marginBlockEnd="$4"
        fontSize={tokens.typography.fontSize.sm}
      >
        {meal.notes}
      </DsText>
    ) : null}
    {formatSimpleNutrition(meal.nutrition) ? (
      <DsText
        marginBlockEnd="$4"
        fontSize={tokens.typography.fontSize.sm}
        color={tokens.colors.gray.gray9}
      >
        {formatSimpleNutrition(meal.nutrition)}
      </DsText>
    ) : null}
    <XStack
      marginBlockEnd="$6"
      flexWrap="wrap"
      gap="$3"
    >
      <PrimaryButton
        label="Cook meal"
        onPress={onCook}
      />
      <SecondaryButton
        label="Edit"
        onPress={onEdit}
      />
    </XStack>
    <SectionCard title="Recipes">
      {meal.members.map(member => (
        <Pressable
          key={member.recipeId}
          style={memberRowStyle}
          disabled={member.accessLost}
          onPress={() => {
            onRecipePress(member.recipeId);
          }}
        >
          <DsText
            fontSize={tokens.typography.fontSize.md}
            fontWeight={tokens.typography.fontWeight.medium}
            color={tokens.colors.gray.gray10}
          >
            {member.title}
            {member.accessLost ? ' (unavailable)' : ''}
          </DsText>
          <DsText
            color="$textMuted"
            fontSize={tokens.typography.fontSize.sm}
          >
            {member.servings} serving
            {member.servings === 1 ? '' : 's'}
            {formatMemberNutrition(member)
              ? ` · ${formatMemberNutrition(member)}`
              : ''}
          </DsText>
        </Pressable>
      ))}
    </SectionCard>
  </ScreenScroll>
);
