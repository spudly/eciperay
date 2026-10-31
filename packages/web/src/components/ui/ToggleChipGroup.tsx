import type {ToggleChipGroupProps} from '@eciperay/client';
import {Button, ButtonRow} from '@spudly/ui';
import {useState} from 'react';

// The design system retired its chip components (@spudly/ui 1.15.0):
// a selectable option is now a toggle Button (the `selected`
// treatment) composed in a ButtonRow — the same pattern the DS
// PresetValueSelector uses for its preset choices. This mirror keeps
// the app's ToggleChipGroup name and prop shape over that treatment.
export const ToggleChipGroup = ({
  options,
  multi = false,
  selectedIds,
  selectedId,
  onChange,
  disabled,
}: ToggleChipGroupProps) => {
  if (multi) {
    const values = selectedIds ? [...selectedIds] : [];
    return (
      <ButtonRow>
        {options.map(opt => (
          <Button
            key={opt.id}
            variant="secondary"
            size="sm"
            selected={values.includes(opt.id)}
            disabled={disabled}
            onPress={() => {
              const newValues = values.includes(opt.id)
                ? values.filter(v => v !== opt.id)
                : [...values, opt.id];
              onChange(newValues);
            }}
          >
            {opt.label}
          </Button>
        ))}
      </ButtonRow>
    );
  }

  return (
    <ButtonRow>
      {options.map(opt => (
        <Button
          key={opt.id}
          variant="secondary"
          size="sm"
          selected={selectedId === opt.id}
          disabled={disabled}
          onPress={() => {
            onChange(opt.id);
          }}
        >
          {opt.label}
        </Button>
      ))}
    </ButtonRow>
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
