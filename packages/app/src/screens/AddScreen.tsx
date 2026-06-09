import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

type AddProps = {navigation: {navigate: (screen: string) => void}};

type AddOption = {label: string; description: string; screen: string};

const OPTIONS: AddOption[] = [
  {
    label: 'Manual entry',
    description: 'Type your recipe from scratch',
    screen: 'ManualEntry',
  },
  {
    label: 'Import from URL',
    description: 'Paste a link to any recipe website',
    screen: 'ImportUrl',
  },
  {
    label: 'Import from image',
    description: 'Take a photo or use your library',
    screen: 'ImportImage',
  },
];

const OptionButton = ({
  option,
  onPress,
}: {
  option: AddOption;
  onPress: () => void;
}) => (
  <TouchableOpacity
    className="mb-3 rounded-xl border border-gray-100 bg-white p-4"
    onPress={onPress}
  >
    <Text className="text-base font-semibold text-gray-900">
      {option.label}
    </Text>
    <Text className="mt-1 text-sm text-muted">{option.description}</Text>
  </TouchableOpacity>
);

export const AddScreen = ({navigation}: AddProps) => (
  <View className="flex-1 bg-gray-50 px-4 pt-8">
    <Text className="mb-6 text-2xl font-bold text-gray-900">Add Recipe</Text>
    {OPTIONS.map(option => (
      <OptionButton
        key={option.screen}
        option={option}
        onPress={() => {
          navigation.navigate(option.screen);
        }}
      />
    ))}
  </View>
);
