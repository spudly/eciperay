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
    className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
    onPress={onPress}
  >
    <Text className="font-semibold text-gray-900 text-base">
      {option.label}
    </Text>
    <Text className="text-sm text-muted mt-1">{option.description}</Text>
  </TouchableOpacity>
);

export const AddScreen = ({navigation}: AddProps) => (
  <View className="flex-1 bg-gray-50 px-4 pt-8">
    <Text className="text-2xl font-bold text-gray-900 mb-6">Add Recipe</Text>
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
