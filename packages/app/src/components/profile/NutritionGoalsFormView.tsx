import type {NutritionGoalsFormViewProps} from '@eciperay/client';
import type {NutritionGoals} from '@eciperay/types';
import {View} from 'react-native';

import {ErrorText} from '../ui/ErrorText';
import {PrimaryButton} from '../ui/PrimaryButton';
import {SectionCard} from '../ui/SectionCard';
import {TextField} from '../ui/TextField';

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
  <TextField
    label={label}
    value={formatGoalValue(value)}
    onChange={text => {
      onChange(parseOptionalNumber(text));
    }}
    placeholder="Optional"
  />
);

export const NutritionGoalsFormView = ({
  goals,
  saving,
  error,
  onChange,
  onSave,
}: NutritionGoalsFormViewProps) => {
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
      {error ? <ErrorText>{error}</ErrorText> : null}
      <View className="mt-3">
        <PrimaryButton
          label="Save goals"
          loading={saving}
          onPress={onSave}
        />
      </View>
    </SectionCard>
  );
};
