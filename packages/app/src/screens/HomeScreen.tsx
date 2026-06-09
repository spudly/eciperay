import React from 'react';
import {ScrollView, Text, View} from 'react-native';

export const HomeScreen = () => (
  <ScrollView className="flex-1 bg-gray-50">
    <View className="px-4 pt-6">
      <Text className="mb-4 text-2xl font-bold text-gray-900">Recipoo</Text>
      <Text className="text-muted">Your recipes will appear here.</Text>
    </View>
  </ScrollView>
);
