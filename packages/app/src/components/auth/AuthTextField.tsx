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
  <View className="mb-4">
    <Text className="mb-1.5 text-sm font-medium text-gray-700">{label}</Text>
    <TextInput
      accessibilityLabel={label}
      autoCapitalize={autoCapitalize}
      autoComplete={autoComplete}
      className="
        rounded-lg border border-gray-300 bg-white px-4 py-3 text-base
        text-gray-900
      "
      keyboardType={keyboardType}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      textContentType={textContentType}
      value={value}
    />
  </View>
);
