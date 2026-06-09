import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import type {AddStackParamList} from '../navigation/types';

type AddProps = NativeStackScreenProps<AddStackParamList, 'AddScreen'>;

type AddOption = {
  label: string;
  description: string;
  screen: keyof Omit<AddStackParamList, 'AddScreen' | 'ImportReview'>;
};

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
  {
    label: 'Import from text',
    description: 'Paste rich text from Word or the web',
    screen: 'ImportText',
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
    <Text className="text-muted mt-1 text-sm">{option.description}</Text>
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
