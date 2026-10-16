import {eciperayTheme, tokens} from '@spudly/ui';
import React from 'react';
import {Text, TextInput, type TextInputProps, View} from 'react-native';

type AuthTextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
} & Pick<
  TextInputProps,
  | 'secureTextEntry'
  | 'keyboardType'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'textContentType'
>;

/**
 * Auth input on RN primitives with every visual value sourced from @spudly/ui
 * tokens (the BookLoadingSpinner pattern) — the input chrome reproduces
 * ui-text-field: rounded-lg value (radii.md), gray-300 border (gray4), white
 * fill (semantic surface), px-4/py-3, text-base (fontSize.md) in gray-900
 * (gray10). The label's 6px bottom margin is geometry from the old mbe-1.5,
 * between DS spacing steps.
 */
const styles = {
  wrapper: {marginBottom: tokens.spacing[4]} as const,
  label: {
    marginBottom: 6,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: tokens.colors.gray.gray8,
  } as const,
  input: {
    borderRadius: tokens.radii.md,
    borderWidth: 1,
    borderColor: tokens.colors.gray.gray4,
    backgroundColor: eciperayTheme.semantic.surface,
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[3],
    fontSize: tokens.typography.fontSize.md,
    color: tokens.colors.gray.gray10,
  } as const,
};

export const AuthTextField = ({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  textContentType,
}: AuthTextFieldProps) => (
  <View style={styles.wrapper}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      accessibilityLabel={label}
      autoCapitalize={autoCapitalize}
      autoComplete={autoComplete}
      style={styles.input}
      keyboardType={keyboardType}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      textContentType={textContentType}
      value={value}
    />
  </View>
);
