import type {TextFieldProps} from '@eciperay/client';
import {useState} from 'react';
import {Text, TextInput, View} from 'react-native';

export const TextField = ({
  value,
  onChange,
  placeholder,
  label,
  type = 'text',
  autoComplete,
  disabled = false,
}: TextFieldProps) => (
  <View className={label ? 'mb-4' : undefined}>
    {label ? (
      <Text className="mb-1.5 text-sm font-medium text-gray-700">{label}</Text>
    ) : null}
    <TextInput
      accessibilityLabel={label ?? placeholder}
      autoCapitalize={type === 'email' ? 'none' : 'sentences'}
      autoComplete={autoComplete as never}
      className="ui-text-field"
      editable={!disabled}
      keyboardType={type === 'email' ? 'email-address' : 'default'}
      onChangeText={onChange}
      placeholder={placeholder}
      secureTextEntry={type === 'password'}
      textContentType={
        type === 'email'
          ? 'emailAddress'
          : type === 'password'
            ? 'password'
            : undefined
      }
      value={value}
    />
  </View>
);

if (__DEV__) {
  const TextFieldDemo = () => {
    const [value, setValue] = useState('Hello');

    return (
      <TextField
        label="Text field"
        value={value}
        onChange={setValue}
        placeholder="Type here"
      />
    );
  };

  TextField.demo = () => <TextFieldDemo />;
}
