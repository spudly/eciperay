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
  progressIsPerDayAverage,
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
          {/* The caption names what the server actually compared
              against the daily goals (#266): the plan's per-day average
              only when the plan has a valid date range (perDay is set
              then); plan dates are optional, and for undated plans the
              server falls back to the whole-plan total — label that as
              a plan total, never as a daily average. Either way the
              label stops the figures reading as an unexplained second
              total next to "Plan total:". The per-day / plan-total
              wording is scoped to the nutrient quantities (calories,
              protein): satiety is computed from aggregated nutrient
              ratios, so it is the same plan-wide score at any plan
              length — never an average or a total (CodeRabbit on
              #272). */}
          <p className="text-muted mbe-2 text-sm">
            {progressIsPerDayAverage
              ? 'Per-day average calories and protein for this plan, compared with your daily goals. Satiety is a plan-wide score.'
              : 'Plan-total calories and protein for this plan, compared with your daily goals. Satiety is a plan-wide score.'}
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
