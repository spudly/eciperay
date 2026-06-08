import React, {useState} from 'react';
import {Alert, Text, TextInput, TouchableOpacity, View} from 'react-native';

import {supabase} from '../../lib/supabase';
import {errorMessage} from '../../lib/errorMessage';

type ForgotProps = {navigation: {goBack: () => void}};

const sendReset = async (email: string) => {
  const {error} = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    throw error;
  }
};

export const ForgotPasswordScreen = ({navigation}: ForgotProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    try {
      await sendReset(email);
      Alert.alert('Check your email', 'A password reset link has been sent.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <Text className="text-3xl font-bold text-gray-900 mb-4">
        Reset password
      </Text>
      <Text className="text-muted mb-8">
        {"We'll send a reset link to your email."}
      </Text>
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-base"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TouchableOpacity
        className="bg-primary rounded-lg py-4 items-center"
        onPress={() => void handleReset()}
        disabled={loading}
      >
        <Text className="text-white font-semibold text-base">
          {loading ? 'Sending…' : 'Send Reset Link'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
