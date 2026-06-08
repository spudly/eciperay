import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import {supabase} from '../lib/supabase';

const handleSignOut = () => supabase.auth.signOut();

export const ProfileScreen = () => (
  <View className="flex-1 bg-gray-50 px-6 pt-8">
    <Text className="text-2xl font-bold text-gray-900 mb-8">Profile</Text>
    <TouchableOpacity
      className="bg-red-500 rounded-lg py-4 items-center"
      onPress={() => void handleSignOut()}
    >
      <Text className="text-white font-semibold text-base">Sign Out</Text>
    </TouchableOpacity>
  </View>
);
