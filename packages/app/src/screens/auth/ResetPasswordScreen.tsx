import {errorMessage} from '@eciperay/client';
import React, {useState} from 'react';
import {Alert, Text, TouchableOpacity, View} from 'react-native';

import {AuthTextField} from '../../components/auth/AuthTextField';
import {normalizeAuthPassword} from '../../lib/normalizeAuthInput';
import {supabase} from '../../lib/supabase';

type ResetPasswordProps = {onComplete: () => void};

export const ResetPasswordScreen = ({onComplete}: ResetPasswordProps) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const {error} = await supabase.auth.updateUser({
        password: normalizeAuthPassword(password),
      });
      if (error) {
        throw error;
      }
      onComplete();
      Alert.alert('Password updated', 'You can now use your new password.');
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <Text className="mb-4 text-3xl font-bold text-gray-900">
        New password
      </Text>
      <Text className="text-muted mb-8">
        Choose a new password for your account.
      </Text>
      <AuthTextField
        autoCapitalize="none"
        autoComplete="password-new"
        label="New password"
        onChangeText={setPassword}
        secureTextEntry
        textContentType="newPassword"
        value={password}
      />
      <TouchableOpacity
        className="bg-primary items-center rounded-lg py-4"
        onPress={() => void handleSubmit()}
        disabled={loading}
      >
        <Text className="text-base font-semibold text-white">
          {loading ? 'Updating…' : 'Update password'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
