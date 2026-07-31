import type {ToggleChipGroupProps} from '@eciperay/client';
import clsx from 'clsx';
import {useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

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
    <View className="flex-row flex-wrap gap-2">
      {options.map(option => {
        const selected = isSelected(option.id);
        return (
          <TouchableOpacity
            key={option.id}
            disabled={disabled}
            className={clsx('ui-toggle-chip', {
              'bg-primary': selected && !option.color,
              'bg-gray-100': !selected && !option.color,
              'border-primary border-2': selected && option.color,
            })}
            style={
              option.color ? {backgroundColor: `${option.color}22`} : undefined
            }
            onPress={() => {
              handlePress(option.id);
            }}
          >
            <Text
              className={clsx('text-sm font-medium', {
                'text-white': selected && !option.color,
                'text-gray-700': !selected && !option.color,
              })}
              style={option.color ? {color: option.color} : undefined}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
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
