import {errorMessage} from '@eciperay/client';
import React, {useState} from 'react';
import {Alert, Text, TouchableOpacity, View} from 'react-native';

import {AuthTextField} from '../../components/auth/AuthTextField';
import {api} from '../../lib/api';
import {
  normalizeAuthEmail,
  normalizeAuthPassword,
} from '../../lib/normalizeAuthInput';
import {supabase} from '../../lib/supabase';

type SignUpProps = {navigation: {navigate: (screen: string) => void}};

const signUp = async (email: string, password: string, displayName: string) => {
  const {data, error} = await supabase.auth.signUp({
    email,
    password,
    options: {data: {display_name: displayName}},
  });
  if (error) {
    throw error;
  }
  if (data.session) {
    await api.auth.syncUser();
  } else {
    return 'confirm-email';
  }
};

const runSignUp = async (
  email: string,
  password: string,
  displayName: string,
  setLoading: (v: boolean) => void,
) => {
  setLoading(true);
  try {
    const result = await signUp(
      normalizeAuthEmail(email),
      normalizeAuthPassword(password),
      displayName.trim(),
    );
    if (result === 'confirm-email') {
      Alert.alert(
        'Check your email',
        'Click the confirmation link we sent you, then sign in.',
      );
    }
  } catch (error) {
    Alert.alert('Sign up failed', errorMessage(error));
  } finally {
    setLoading(false);
  }
};

export const SignUpScreen = ({navigation}: SignUpProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSignUp = () =>
    void runSignUp(email, password, displayName, setLoading);

  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <Text className="mb-8 text-3xl font-bold text-gray-900">
        Create account
      </Text>
      <AuthTextField
        label="Your name"
        onChangeText={setDisplayName}
        textContentType="name"
        value={displayName}
      />
      <AuthTextField
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        textContentType="emailAddress"
        value={email}
      />
      <AuthTextField
        autoCapitalize="none"
        autoComplete="password-new"
        label="Password"
        onChangeText={setPassword}
        secureTextEntry
        textContentType="newPassword"
        value={password}
      />
      <TouchableOpacity
        className="bg-primary items-center rounded-lg py-4"
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text className="text-base font-semibold text-white">
          {loading ? 'Creating account…' : 'Create Account'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="mt-4 items-center"
        onPress={() => {
          navigation.navigate('SignIn');
        }}
      >
        <Text className="text-primary text-base">
          Already have an account? Sign in
        </Text>
      </TouchableOpacity>
    </View>
  );
};
