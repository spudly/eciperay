import type {ToggleChipGroupProps} from '@eciperay/client';
import clsx from 'clsx';
import {useState} from 'react';

export const ToggleChipGroup = ({
  options,
  multi = false,
  selectedIds,
  selectedId,
  onChange,
  disabled = false,
}: ToggleChipGroupProps) => {
  const isSelected = (id: string) => {
    if (multi) {
      return selectedIds?.has(id) ?? false;
    }
    return selectedId === id;
  };

  const handlePress = (id: string) => {
    if (disabled) {
      return;
    }
    if (multi) {
      const current = selectedIds ?? new Set<string>();
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onChange([...next]);
      return;
    }
    onChange(id);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(option => {
        const selected = isSelected(option.id);
        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            className={clsx('ui-toggle-chip', {
              'bg-primary text-white': selected && !option.color,
              'bg-gray-100 text-gray-700': !selected && !option.color,
              'ring-primary ring-2': selected && option.color,
            })}
            style={
              option.color
                ? {backgroundColor: `${option.color}22`, color: option.color}
                : undefined
            }
            onClick={() => {
              handlePress(option.id);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

if (import.meta.env.DEV) {
  ToggleChipGroup.demo = function ToggleChipGroupDemo() {
    const [selectedId, setSelectedId] = useState('1x');

    return (
      <ToggleChipGroup
        options={[
          {id: '1x', label: '1×'},
          {id: '2x', label: '2×'},
        ]}
        selectedId={selectedId}
        onChange={value => {
          if (typeof value === 'string') {
            setSelectedId(value);
          }
        }}
      />
    );
  };
}
