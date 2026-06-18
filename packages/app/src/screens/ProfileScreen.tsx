import {useAuth} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import {LegalLinks} from '../components/LegalLinks';
import {supabase} from '../lib/supabase';
import type {ProfileStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileHome'>;

export const ProfileScreen = ({navigation}: Props) => {
  const {session} = useAuth();

  return (
    <View className="flex-1 bg-gray-50 px-6 pt-8">
      <Text className="mb-2 text-2xl font-bold text-gray-900">Profile</Text>
      {session?.user.email ? (
        <Text className="mb-6 text-gray-700">{session.user.email}</Text>
      ) : null}
      <TouchableOpacity
        className="mb-4 items-center rounded-lg bg-gray-200 py-4"
        onPress={() => {
          navigation.navigate('Tags');
        }}
      >
        <Text className="text-base font-semibold text-gray-800">
          Manage Tags
        </Text>
      </TouchableOpacity>
      <View className="mb-8">
        <Text className="mb-3 text-lg font-semibold text-gray-900">Legal</Text>
        <LegalLinks />
      </View>
      <TouchableOpacity
        className="items-center rounded-lg bg-red-500 py-4"
        onPress={() => {
          void supabase.auth.signOut();
        }}
      >
        <Text className="text-base font-semibold text-white">Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};
