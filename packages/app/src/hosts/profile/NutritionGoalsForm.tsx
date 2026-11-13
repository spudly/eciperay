import type {NutritionGoals} from '@eciperay/types';
import {useEffect, useRef, useState} from 'react';
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

const GoalField = ({label, value, onChange}: GoalFieldProps) => {
  // Keep the raw text locally so intermediate input (e.g. "1." on the way
  // to "1.5", which the server schema accepts as a non-negative decimal)
  // is not clobbered by re-rendering the parsed number on every keystroke.
  // The parent still receives the parsed value for each keystroke.
  const [text, setTextState] = useState(() => formatGoalValue(value));
  const textRef = useRef(text);
  const setText = (next: string) => {
    textRef.current = next;
    setTextState(next);
  };

  // Resync from the prop only when it changes to a value the current
  // text does not already parse to (an external change, not our own
  // keystroke echoing back through the parent).
  useEffect(() => {
    if (parseOptionalNumber(textRef.current) !== value) {
      setText(formatGoalValue(value));
    }
  }, [value]);

  return (
    <LabeledTextInput
      label={label}
      value={text}
      onChangeText={nextText => {
        setText(nextText);
        onChange(parseOptionalNumber(nextText));
      }}
      placeholder="Optional"
    />
  );
};

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
        label="Calories min"
        value={goals.caloriesMin}
        onChange={caloriesMin => {
          patch({caloriesMin});
        }}
      />
      <GoalField
        label="Calories max"
        value={goals.caloriesMax}
        onChange={caloriesMax => {
          patch({caloriesMax});
        }}
      />
      <GoalField
        label="Protein (g) min"
        value={goals.proteinGMin}
        onChange={proteinGMin => {
          patch({proteinGMin});
        }}
      />
      <GoalField
        label="Protein (g) max"
        value={goals.proteinGMax}
        onChange={proteinGMax => {
          patch({proteinGMax});
        }}
      />
      <GoalField
        label="Carbs (g) min"
        value={goals.carbsGMin}
        onChange={carbsGMin => {
          patch({carbsGMin});
        }}
      />
      <GoalField
        label="Carbs (g) max"
        value={goals.carbsGMax}
        onChange={carbsGMax => {
          patch({carbsGMax});
        }}
      />
      <GoalField
        label="Fat (g) min"
        value={goals.fatGMin}
        onChange={fatGMin => {
          patch({fatGMin});
        }}
      />
      <GoalField
        label="Fat (g) max"
        value={goals.fatGMax}
        onChange={fatGMax => {
          patch({fatGMax});
        }}
      />
      <GoalField
        label="Satiety score min"
        value={goals.satietyScoreMin}
        onChange={satietyScoreMin => {
          patch({satietyScoreMin});
        }}
      />
      <GoalField
        label="Satiety score max"
        value={goals.satietyScoreMax}
        onChange={satietyScoreMax => {
          patch({satietyScoreMax});
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
