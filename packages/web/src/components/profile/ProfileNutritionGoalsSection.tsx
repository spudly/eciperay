import {defaultNutritionGoals, errorMessage, queryKeys} from '@eciperay/client';
import type {NutritionGoals} from '@eciperay/types';
import {tokens} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useEffect, useId, useState} from 'react';
import {Button, Input, Label, Text, YStack, styled} from 'tamagui';

import {eciperay} from '../../lib/api.js';

// This section mirrors the design system's NutritionGoalsForm view
// (structure, fields, and copy) re-expressed with host-side Tamagui
// primitives: in @spudly/ui 6.x that view is internal to the design
// system and no exported page renders it, so the host composes the
// section itself pending page coverage for it.

const FieldInput = styled(Input, {
  name: 'ProfileTextField',

  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$textMuted',
  borderRadius: tokens.radii.md,
  paddingHorizontal: tokens.spacing[3],
  minHeight: 44,
  fontSize: tokens.typography.fontSize.md,
  color: '$color',
});

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

const GoalField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) => {
  const id = useId();
  const [text, setText] = useState(() => formatGoalValue(value));
  useEffect(() => {
    setText(current =>
      parseOptionalNumber(current) === value ? current : formatGoalValue(value),
    );
  }, [value]);
  return (
    <YStack gap={tokens.spacing[1]}>
      <Label
        htmlFor={id}
        fontSize={tokens.typography.fontSize.sm}
      >
        {label}
      </Label>
      <FieldInput
        id={id}
        value={text}
        onChangeText={next => {
          setText(next);
          onChange(parseOptionalNumber(next));
        }}
        placeholder="Optional"
        placeholderTextColor="$textMuted"
      />
    </YStack>
  );
};

const NutritionGoalsForm = ({
  goals,
  saving = false,
  error,
  onChange,
  onSave,
}: {
  goals: NutritionGoals;
  saving?: boolean;
  error?: string | null;
  onChange: (goals: NutritionGoals) => void;
  onSave: () => void;
}) => {
  const patch = (partial: Partial<NutritionGoals>) => {
    onChange({...goals, ...partial});
  };

  return (
    <YStack
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={tokens.radii.lg}
      padding={tokens.spacing[4]}
    >
      <YStack paddingBottom={tokens.spacing[3]}>
        <Text
          fontSize={tokens.typography.fontSize.xl}
          fontWeight={tokens.typography.fontWeight.semibold}
        >
          Daily nutrition goals
        </Text>
      </YStack>
      <YStack gap={tokens.spacing[3]}>
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
          <YStack
            borderWidth={1}
            borderRadius={tokens.radii.md}
            padding={tokens.spacing[3]}
            backgroundColor={tokens.colors.danger.danger1}
            borderColor={tokens.colors.danger.danger4}
          >
            <Text
              fontSize={tokens.typography.fontSize.sm}
              color={tokens.colors.danger.danger8}
            >
              {error}
            </Text>
          </YStack>
        ) : null}
        <YStack paddingTop="$3">
          <Button
            backgroundColor="$primary"
            borderColor="transparent"
            borderWidth={1}
            borderRadius={tokens.radii.md}
            color="$onPrimary"
            fontSize={tokens.typography.fontSize.md}
            fontWeight={tokens.typography.fontWeight.semibold}
            paddingHorizontal={tokens.spacing[4]}
            paddingVertical={tokens.spacing[3]}
            opacity={saving ? 0.5 : 1}
            disabled={saving}
            onPress={onSave}
          >
            Save goals
          </Button>
        </YStack>
      </YStack>
    </YStack>
  );
};

export const ProfileNutritionGoalsSection = () => {
  const queryClient = useQueryClient();
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals>(
    defaultNutritionGoals(),
  );
  const [goalsError, setGoalsError] = useState<string | null>(null);

  const {data: savedGoals} = useQuery({
    queryKey: queryKeys.nutritionGoals(),
    queryFn: () => eciperay.account.getNutritionGoals(),
  });

  useEffect(() => {
    if (savedGoals) {
      setNutritionGoals(savedGoals);
    }
  }, [savedGoals]);

  const saveGoalsMutation = useMutation({
    mutationFn: () => eciperay.account.putNutritionGoals(nutritionGoals),
    onSuccess: data => {
      setNutritionGoals(data);
      setGoalsError(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.nutritionGoals(),
      });
      void queryClient.invalidateQueries({queryKey: queryKeys.mealPlans()});
    },
    onError: error => {
      setGoalsError(errorMessage(error));
    },
  });

  return (
    <NutritionGoalsForm
      goals={nutritionGoals}
      saving={saveGoalsMutation.isPending}
      error={goalsError}
      onChange={setNutritionGoals}
      onSave={() => {
        saveGoalsMutation.mutate();
      }}
    />
  );
};
