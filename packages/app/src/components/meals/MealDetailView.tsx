import type {MealDetailViewProps} from '@eciperay/client';
import {formatSimpleNutrition} from '@eciperay/client';
import type {MealRecipeMember} from '@eciperay/types';
import {Pressable, Text, View} from 'react-native';

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

export const MealDetailView = ({
  meal,
  onEdit,
  onCook,
  onRecipePress,
}: MealDetailViewProps) => (
  <ScreenScroll>
    <PageTitle spacing="section">{meal.title}</PageTitle>
    {meal.notes ? (
      <Text className="text-muted mb-4 text-sm">{meal.notes}</Text>
    ) : null}
    {formatSimpleNutrition(meal.nutrition) ? (
      <Text className="mb-4 text-sm text-gray-800">
        {formatSimpleNutrition(meal.nutrition)}
      </Text>
    ) : null}
    <View className="mb-6 flex-row flex-wrap gap-3">
      <PrimaryButton
        label="Cook meal"
        onPress={onCook}
      />
      <SecondaryButton
        label="Edit"
        onPress={onEdit}
      />
    </View>
    <SectionCard title="Recipes">
      {meal.members.map(member => (
        <Pressable
          key={member.recipeId}
          className="border-b border-gray-100 py-3"
          disabled={member.accessLost}
          onPress={() => {
            onRecipePress(member.recipeId);
          }}
        >
          <Text className="text-base font-medium text-gray-900">
            {member.title}
            {member.accessLost ? ' (unavailable)' : ''}
          </Text>
          <Text className="text-muted text-sm">
            {member.servings} serving
            {member.servings === 1 ? '' : 's'}
            {formatMemberNutrition(member)
              ? ` · ${formatMemberNutrition(member)}`
              : ''}
          </Text>
        </Pressable>
      ))}
    </SectionCard>
  </ScreenScroll>
);
