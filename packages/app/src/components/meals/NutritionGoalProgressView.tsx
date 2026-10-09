import type {NutritionGoalProgressViewProps} from '@eciperay/client';
import {formatSimpleNutrition} from '@eciperay/client';
import type {NutritionGoalFieldProgress} from '@eciperay/types';
import {Text, View} from 'react-native';

import {SectionCard} from '../ui/SectionCard';
import {TextLinkButton} from '../ui/TextLinkButton';

const bandLabel = (band: NutritionGoalFieldProgress['band']): string => {
  if (band === 'under') {
    return 'Below goal';
  }
  if (band === 'over') {
    return 'Above goal';
  }
  return 'On track';
};

const ProgressRow = ({
  label,
  field,
}: {
  label: string;
  field: NutritionGoalFieldProgress;
}) => (
  <View className="flex-row justify-between border-b border-gray-100 py-2">
    <Text className="text-sm text-gray-700">{label}</Text>
    <Text className="text-sm text-gray-900">
      {Math.round(field.actual)} / {Math.round(field.goal)} ·{' '}
      {bandLabel(field.band)}
    </Text>
  </View>
);

export const NutritionGoalProgressView = ({
  progress,
  nutrition,
  onSetGoalsPress,
}: NutritionGoalProgressViewProps) => {
  if (!progress && !nutrition) {
    return null;
  }

  return (
    <SectionCard title="Nutrition goals">
      {formatSimpleNutrition(nutrition) ? (
        <Text className="text-muted mb-3 text-sm">
          Plan total: {formatSimpleNutrition(nutrition)}
        </Text>
      ) : null}
      {progress ? (
        <>
          {progress.calories ? (
            <ProgressRow
              label="Calories"
              field={progress.calories}
            />
          ) : null}
          {progress.proteinG ? (
            <ProgressRow
              label="Protein"
              field={progress.proteinG}
            />
          ) : null}
          {progress.satietyScore ? (
            <ProgressRow
              label="Satiety"
              field={progress.satietyScore}
            />
          ) : null}
        </>
      ) : (
        <Text className="text-muted text-sm">
          Set daily nutrition goals to compare this plan.
        </Text>
      )}
      {onSetGoalsPress ? (
        <View className="mt-3">
          <TextLinkButton
            label="Set nutrition goals"
            onPress={onSetGoalsPress}
          />
        </View>
      ) : null}
    </SectionCard>
  );
};
