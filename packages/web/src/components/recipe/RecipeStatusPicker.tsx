import {RECIPE_STATUS_LABELS, RECIPE_STATUS_OPTIONS} from '@eciperay/client';
import type {RecipeStatus} from '@eciperay/types';
import {useMemo, useState} from 'react';

import {SelectField} from '../ui/SelectField.js';

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
  const options = useMemo(
    () =>
      RECIPE_STATUS_OPTIONS.map(status => ({
        value: status,
        label: RECIPE_STATUS_LABELS[status],
      })),
    [],
  );

  return (
    <SelectField
      id="status"
      label="Status"
      value={value}
      disabled={disabled}
      options={options}
      onChange={next => {
        onChange(next as RecipeStatus);
      }}
    />
  );
};

if (import.meta.env.DEV) {
  RecipeStatusPicker.demo = function RecipeStatusPickerDemo() {
    const [status, setStatus] = useState<RecipeStatus>('evolving');

    return (
      <RecipeStatusPicker
        value={status}
        onChange={setStatus}
      />
    );
  };
}
