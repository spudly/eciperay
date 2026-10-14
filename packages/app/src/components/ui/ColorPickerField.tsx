import type {ColorPickerFieldProps} from '@eciperay/client';
import {ColorPickerField as DsColorPickerField} from '@spudly/ui';
import {useState} from 'react';
import {StyleSheet, View} from 'react-native';

const styles = StyleSheet.create({
  dimmed: {opacity: 0.5},
});

/**
 * Default swatch palette. The DS ColorPickerField requires a fixed list of
 * colors (the eciperay prop API has no palette), so these cover the common
 * tag colors; a value outside the palette simply shows no swatch selected.
 */
const DEFAULT_COLORS = [
  '#6366f1',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#6b7280',
];

export const ColorPickerField = ({
  label,
  value,
  onChange,
  name,
  disabled = false,
}: ColorPickerFieldProps) => (
  <View
    pointerEvents={disabled ? 'none' : 'auto'}
    style={disabled ? styles.dimmed : undefined}
    accessibilityState={{disabled}}
  >
    <DsColorPickerField
      label={label}
      colors={DEFAULT_COLORS}
      value={value}
      onChange={color => {
        if (!disabled) {
          onChange(color);
        }
      }}
      id={name}
    />
  </View>
);

if (__DEV__) {
  const ColorPickerFieldDemo = () => {
    const [value, setValue] = useState('#6366f1');

    return (
      <ColorPickerField label="Tag color" value={value} onChange={setValue} />
    );
  };

  ColorPickerField.demo = () => <ColorPickerFieldDemo />;
}
