import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

type Props = {servings: number; onChange: (n: number) => void};

export const ServingsStepper = ({servings, onChange}: Props) => (
  <View className="mb-3 flex-row items-center gap-3">
    <Text className="text-sm font-medium text-gray-700">Servings:</Text>
    <TouchableOpacity
      className="size-8 items-center justify-center rounded-full bg-gray-100"
      onPress={() => {
        onChange(Math.max(1, servings - 1));
      }}
    >
      <Text className="text-lg font-medium">−</Text>
    </TouchableOpacity>
    <Text className="w-6 text-center text-base font-semibold">{servings}</Text>
    <TouchableOpacity
      className="size-8 items-center justify-center rounded-full bg-gray-100"
      onPress={() => {
        onChange(servings + 1);
      }}
    >
      <Text className="text-lg font-medium">+</Text>
    </TouchableOpacity>
  </View>
);
