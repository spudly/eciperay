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
      <Text className="text-3xl font-bold text-gray-900 mb-8">
        Welcome back
      </Text>
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-base"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        className="bg-primary rounded-lg py-4 items-center"
        onPress={() => void handleSignIn()}
        disabled={loading}
      >
        <Text className="text-white font-semibold text-base">
          {loading ? 'Signing in…' : 'Sign In'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="mt-4 items-center"
        onPress={() => {
          navigation.navigate('SignUp');
        }}
      >
        <Text className="text-primary text-base">Create an account</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="mt-2 items-center"
        onPress={() => {
          navigation.navigate('ForgotPassword');
        }}
      >
        <Text className="text-muted text-sm">Forgot password?</Text>
      </TouchableOpacity>
    </View>
  );
};
