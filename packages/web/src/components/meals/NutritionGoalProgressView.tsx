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
  <div className="flex justify-between border-be border-gray-100 py-2 text-sm">
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
        <p className="text-muted mbe-3 text-sm">
          Plan total: {formatSimpleNutrition(nutrition)}
        </p>
      ) : null}
      {progress ? (
        <>
          {/* The progress figures are the plan's per-day average (the
              server compares the plan's perDay nutrition), measured
              against the daily goals — label them so they do not read
              as a second, conflicting plan total (#266). */}
          <p className="text-muted mbe-2 text-sm">
            Per-day average for this plan, compared with your daily goals.
          </p>
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
        <div className="mbs-3">
          <TextLinkButton
            label="Set nutrition goals"
            onPress={onSetGoalsPress}
          />
        </div>
      ) : null}
    </SectionCard>
  );
};
