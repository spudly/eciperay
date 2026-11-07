import type {NutritionGoals} from '@eciperay/types';
import {YStack} from 'tamagui';

import {
  LabeledTextInput,
  SectionAlert,
  SectionButton,
  SectionCard,
} from './profileSection';

/**
 * Host-side mirror of the design-system NutritionGoalsForm view: in @spudly/ui
 * 6.x that view is internal (not exported) and no exported page renders it, so
 * the section is re-expressed here with Tamagui primitives pending page
 * coverage in the design system. Props, copy, and behavior match the view's
 * contract — the screen keeps the goals query, the form state as a whole, and
 * the save mutation; this section renders the fields and reports whole-goals
 * changes. An empty or non-numeric field crosses back as null; the section
 * validates nothing.
 */

export type NutritionGoalsFormProps = {
  goals: NutritionGoals;
  onChange: (goals: NutritionGoals) => void;
  saving?: boolean;
  error?: string | null;
  onSave: () => void;
};

const parseOptionalNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
};

const formatGoalValue = (value: number | null): string =>
  value === null ? '' : String(value);

type GoalFieldProps = {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
};

const GoalField = ({label, value, onChange}: GoalFieldProps) => (
  <LabeledTextInput
    label={label}
    value={formatGoalValue(value)}
    onChangeText={text => {
      onChange(parseOptionalNumber(text));
    }}
    placeholder="Optional"
  />
);

export const NutritionGoalsForm = ({
  goals,
  onChange,
  saving = false,
  error,
  onSave,
}: NutritionGoalsFormProps) => {
  const patch = (partial: Partial<NutritionGoals>) => {
    onChange({...goals, ...partial});
  };

  return (
    <SectionCard title="Daily nutrition goals">
      <GoalField
        label="Calories"
        value={goals.calories}
        onChange={calories => {
          patch({calories});
        }}
      />
      <GoalField
        label="Protein (g)"
        value={goals.proteinG}
        onChange={proteinG => {
          patch({proteinG});
        }}
      />
      <GoalField
        label="Carbs (g)"
        value={goals.carbsG}
        onChange={carbsG => {
          patch({carbsG});
        }}
      />
      <GoalField
        label="Fat (g)"
        value={goals.fatG}
        onChange={fatG => {
          patch({fatG});
        }}
      />
      <GoalField
        label="Satiety score"
        value={goals.satietyScore}
        onChange={satietyScore => {
          patch({satietyScore});
        }}
      />
      {error ? (
        <SectionAlert
          severity="error"
          message={error}
        />
      ) : null}
      <YStack paddingTop="$3">
        <SectionButton
          variant="primary"
          disabled={saving}
          onPress={onSave}
        >
          Save goals
        </SectionButton>
      </YStack>
    </SectionCard>
  );
};
