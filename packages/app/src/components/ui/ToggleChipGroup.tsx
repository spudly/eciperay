import type {ToggleChipGroupProps} from '@eciperay/client';
import {ToggleChipGroup as DsToggleChipGroup} from '@spudly/ui';
import {useState} from 'react';
import {View} from 'tamagui';

/**
 * Adapter notes: the DS ToggleChipGroup has no `disabled` prop (blocked via a
 * wrapper) and no per-chip `color` (accepted by the prop API but not forwarded
 * — DS chips use the primary palette). Single mode forwards the toggled chip
 * id; multi mode toggles the id in the set and forwards the resulting array,
 * matching the previous behavior.
 */
export const ToggleChipGroup = ({
  options,
  multi = false,
  selectedIds,
  selectedId,
  onChange,
  disabled = false,
}: ToggleChipGroupProps) => {
  const dsOptions = options.map(option => ({
    value: option.id,
    label: option.label,
  }));

  const group = multi ? (
    <DsToggleChipGroup
      options={dsOptions}
      mode="multiple"
      values={selectedIds ? [...selectedIds] : []}
      onChange={id => {
        if (disabled) {
          return;
        }
        const next = new Set(selectedIds ?? []);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        onChange([...next]);
      }}
    />
  ) : (
    <DsToggleChipGroup
      options={dsOptions}
      mode="single"
      value={selectedId}
      onChange={id => {
        if (disabled) {
          return;
        }
        onChange(id);
      }}
    />
  );

  return (
    <View
      pointerEvents={disabled ? 'none' : 'auto'}
      opacity={disabled ? 0.5 : undefined}
      accessibilityState={{disabled}}
    >
      {group}
    </View>
  );
};

if (__DEV__) {
  const ToggleChipGroupDemo = () => {
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

  ToggleChipGroup.demo = () => <ToggleChipGroupDemo />;
}
