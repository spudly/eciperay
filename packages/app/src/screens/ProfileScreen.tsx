import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import {supabase} from '../lib/supabase';

const handleSignOut = () => supabase.auth.signOut();

export const ProfileScreen = () => (
  <View className="flex-1 bg-gray-50 px-6 pt-8">
    <Text className="mb-8 text-2xl font-bold text-gray-900">Profile</Text>
    <TouchableOpacity
      className="items-center rounded-lg bg-red-500 py-4"
      onPress={() => void handleSignOut()}
    >
      <Text className="text-base font-semibold text-white">Sign Out</Text>
    </TouchableOpacity>
  </View>
);
