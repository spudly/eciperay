import type {ToggleChipGroupProps} from '@eciperay/client';
import {ToggleChipGroup as DSToggleChipGroup} from '@spudly/ui';
import {useState} from 'react';

export const ToggleChipGroup = ({
  options,
  multi = false,
  selectedIds,
  selectedId,
  onChange,
}: ToggleChipGroupProps) => {
  // Map client options (id) to DS options (value)
  const dsOptions = options.map(opt => ({
    value: opt.id,
    label: opt.label,
  }));

  if (multi) {
    const values = selectedIds ? [...selectedIds] : [];
    return (
      <DSToggleChipGroup
        options={dsOptions}
        mode="multiple"
        values={values}
        onChange={toggledValue => {
          const newValues = values.includes(toggledValue)
            ? values.filter(v => v !== toggledValue)
            : [...values, toggledValue];
          onChange(newValues);
        }}
      />
    );
  }

  return (
    <DSToggleChipGroup
      options={dsOptions}
      mode="single"
      value={selectedId}
      onChange={toggledValue => {
        onChange(toggledValue);
      }}
    />
  );
};

if (import.meta.env.DEV) {
  ToggleChipGroup.demo = function ToggleChipGroupDemo() {
    const [selected, setSelected] = useState<string | undefined>('a');
    return (
      <ToggleChipGroup
        options={[
          {id: 'a', label: 'Option A'},
          {id: 'b', label: 'Option B'},
        ]}
        selectedId={selected}
        onChange={value => {
          if (typeof value === 'string') setSelected(value);
        }}
      />
    );
  };
}
