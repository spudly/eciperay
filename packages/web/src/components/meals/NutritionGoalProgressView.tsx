import type {NutritionGoalProgressViewProps} from '@eciperay/client';
import {formatSimpleNutrition} from '@eciperay/client';
import type {NutritionGoalFieldProgress} from '@eciperay/types';

import {SectionCard} from '../ui/SectionCard.js';
import {TextLinkButton} from '../ui/TextLinkButton.js';

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
  <div className="flex justify-between border-b border-gray-100 py-2 text-sm">
    <span className="text-gray-700">{label}</span>
    <span className="text-gray-900">
      {Math.round(field.actual)} / {Math.round(field.goal)} ·{' '}
      {bandLabel(field.band)}
    </span>
  </div>
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
        <p className="text-muted mb-3 text-sm">
          Plan total: {formatSimpleNutrition(nutrition)}
        </p>
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
        <p className="text-muted text-sm">
          Set daily nutrition goals to compare this plan.
        </p>
      )}
      {onSetGoalsPress ? (
        <div className="mt-3">
          <TextLinkButton
            label="Set nutrition goals"
            onPress={onSetGoalsPress}
          />
        </div>
      ) : null}
    </SectionCard>
  );
};
