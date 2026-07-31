import type {RadioOptionGroupProps} from '@eciperay/client';
import {useState} from 'react';
import {Pressable, Text, View} from 'react-native';

export const RadioOptionGroup = ({
  name: _name,
  value,
  onChange,
  options,
  disabled = false,
}: RadioOptionGroupProps) => (
  <View
    className="ui-radio-option-group gap-2"
    accessibilityLabel={_name}
    accessibilityRole="radiogroup"
  >
    {options.map(option => {
      const selected = value === option.value;
      return (
        <Pressable
          key={option.value}
          accessibilityRole="radio"
          accessibilityState={{selected, disabled}}
          disabled={disabled}
          className="ui-radio-option flex-row items-start gap-2"
          onPress={() => {
            onChange(option.value);
          }}
        >
          <Text>{selected ? '◉' : '○'}</Text>
          <View className="flex-1">
            <Text className="font-medium text-gray-900">{option.title}</Text>
            {option.description ? (
              <Text className="mt-0.5 text-xs text-gray-500">
                {option.description}
              </Text>
            ) : null}
          </View>
        </Pressable>
      );
    })}
  </View>
);

if (__DEV__) {
  const RadioOptionGroupDemo = () => {
    const [value, setValue] = useState('private');

    return (
      <RadioOptionGroup
        name="visibility-demo"
        value={value}
        onChange={setValue}
        options={[
          {value: 'private', title: 'Private', description: 'Only you'},
          {value: 'public', title: 'Public', description: 'Anyone can browse'},
        ]}
      />
    );
  };

  RadioOptionGroup.demo = () => <RadioOptionGroupDemo />;
}
