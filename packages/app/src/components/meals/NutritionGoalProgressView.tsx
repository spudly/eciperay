import type {NutritionGoalProgressViewProps} from '@eciperay/client';
import {formatSimpleNutrition} from '@eciperay/client';
import {Text as DsText, tokens} from '@spudly/ui';
import type {NutritionGoalFieldProgress} from '@eciperay/types';
import {XStack, YStack} from 'tamagui';

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
  <XStack
    justifyContent="space-between"
    borderBottomWidth={1}
    borderBottomColor={tokens.colors.gray.gray2}
    paddingVertical="$2"
  >
    <DsText
      fontSize={tokens.typography.fontSize.sm}
      color={tokens.colors.gray.gray8}
    >
      {label}
    </DsText>
    <DsText
      fontSize={tokens.typography.fontSize.sm}
      color={tokens.colors.gray.gray10}
    >
      {Math.round(field.actual)} / {Math.round(field.goal)} ·{' '}
      {bandLabel(field.band)}
    </DsText>
  </XStack>
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
        <DsText
          color="$textMuted"
          marginBlockEnd="$3"
          fontSize={tokens.typography.fontSize.sm}
        >
          Plan total: {formatSimpleNutrition(nutrition)}
        </DsText>
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
        <DsText
          color="$textMuted"
          fontSize={tokens.typography.fontSize.sm}
        >
          Set daily nutrition goals to compare this plan.
        </DsText>
      )}
      {onSetGoalsPress ? (
        <YStack marginBlockStart="$3">
          <TextLinkButton
            label="Set nutrition goals"
            onPress={onSetGoalsPress}
          />
        </YStack>
      ) : null}
    </SectionCard>
  );
};
