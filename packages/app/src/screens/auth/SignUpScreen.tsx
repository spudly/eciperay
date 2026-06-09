import React, {useState} from 'react';
import {Alert, Text, TextInput, TouchableOpacity, View} from 'react-native';

import {supabase} from '../../lib/supabase';
import {apiFetch} from '../../lib/api';
import {errorMessage} from '../../lib/errorMessage';

type SignUpProps = {navigation: {navigate: (screen: string) => void}};

const signUp = async (email: string, password: string, displayName: string) => {
  const {data, error} = await supabase.auth.signUp({email, password});
  if (error) {
    throw error;
  }
  // If email confirmation is enabled, session is null until the user clicks the
  // confirmation link. In that case, /auth/sync is called on first sign-in instead.
  if (data.session) {
    await apiFetch('/auth/sync', {
      method: 'POST',
      body: JSON.stringify({email, displayName}),
    });
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
    const result = await signUp(email, password, displayName);
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
      <TextInput
        className="mb-4 rounded-lg border border-gray-300 px-4 py-3 text-base"
        placeholder="Your name"
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput
        className="mb-4 rounded-lg border border-gray-300 px-4 py-3 text-base"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        className="mb-6 rounded-lg border border-gray-300 px-4 py-3 text-base"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        className="items-center rounded-lg bg-primary py-4"
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
        <Text className="text-base text-primary">
          Already have an account? Sign in
        </Text>
      </TouchableOpacity>
    </View>
  );
};
