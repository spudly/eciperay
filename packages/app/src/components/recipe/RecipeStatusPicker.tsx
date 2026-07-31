import {
  RECIPE_STATUS_LABELS,
  RECIPE_STATUS_OPTIONS,
  type ToggleChipOption,
} from '@eciperay/client';
import type {RecipeStatus} from '@eciperay/types';
import {useMemo, useState} from 'react';
import {Text, View} from 'react-native';

import {ToggleChipGroup} from '../ui/ToggleChipGroup';

type Props = {
  value: RecipeStatus;
  onChange: (status: RecipeStatus) => void;
  disabled?: boolean;
};

export const RecipeStatusPicker = ({
  value,
  onChange,
  disabled = false,
}: Props) => {
  const options = useMemo<ToggleChipOption[]>(
    () =>
      RECIPE_STATUS_OPTIONS.map(status => ({
        id: status,
        label: RECIPE_STATUS_LABELS[status],
      })),
    [],
  );

  return (
    <View>
      <Text className="mb-2 text-sm font-medium text-gray-700">Status</Text>
      <ToggleChipGroup
        options={options}
        selectedId={value}
        disabled={disabled}
        onChange={next => {
          if (typeof next === 'string') {
            onChange(next as RecipeStatus);
          }
        }}
      />
    </View>
  );
};

if (__DEV__) {
  const RecipeStatusPickerDemo = () => {
    const [status, setStatus] = useState<RecipeStatus>('evolving');

    return (
      <RecipeStatusPicker
        value={status}
        onChange={setStatus}
      />
    );
  };

  RecipeStatusPicker.demo = () => <RecipeStatusPickerDemo />;
}
