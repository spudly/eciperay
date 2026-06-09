import React, {useState} from 'react';
import {Alert, Text, TextInput, TouchableOpacity, View} from 'react-native';

import {supabase} from '../../lib/supabase';
import {apiFetch} from '../../lib/api';
import {errorMessage} from '../../lib/errorMessage';

type SignInProps = {navigation: {navigate: (screen: string) => void}};

const signIn = async (email: string, password: string) => {
  const {error} = await supabase.auth.signInWithPassword({email, password});
  if (error) {
    throw error;
  }
  await apiFetch('/auth/sync', {method: 'POST', body: JSON.stringify({email})});
};

export const SignInScreen = ({navigation}: SignInProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error) {
      Alert.alert('Sign in failed', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <Text className="mb-8 text-3xl font-bold text-gray-900">
        Welcome back
      </Text>
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
        onPress={() => void handleSignIn()}
        disabled={loading}
      >
        <Text className="text-base font-semibold text-white">
          {loading ? 'Signing in…' : 'Sign In'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="mt-4 items-center"
        onPress={() => {
          navigation.navigate('SignUp');
        }}
      >
        <Text className="text-base text-primary">Create an account</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="mt-2 items-center"
        onPress={() => {
          navigation.navigate('ForgotPassword');
        }}
      >
        <Text className="text-sm text-muted">Forgot password?</Text>
      </TouchableOpacity>
    </View>
  );
};
