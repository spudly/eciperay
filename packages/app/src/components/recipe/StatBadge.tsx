import React from 'react';
import {Text, View} from 'react-native';

export const StatBadge = ({label, value}: {label: string; value: string}) => (
  <View className="items-center">
    <Text className="text-base font-semibold text-gray-900">{value}</Text>
    <Text className="text-muted text-xs">{label}</Text>
  </View>
);
