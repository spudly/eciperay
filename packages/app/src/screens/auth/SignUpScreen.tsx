import {errorMessage} from '@eciperay/client';
import {useState} from 'react';
import {Alert} from 'react-native';

import {SignUpView} from '../../components/auth/SignUpView';
import {AUTH_DEEP_LINK_REDIRECT_URL} from '../../lib/authDeepLink';
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
    options: {
      data: {display_name: displayName},
      emailRedirectTo: AUTH_DEEP_LINK_REDIRECT_URL,
    },
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

  return (
    <SignUpView
      displayName={displayName}
      email={email}
      password={password}
      onDisplayNameChange={setDisplayName}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      loading={loading}
      onSubmit={() => {
        void runSignUp(email, password, displayName, setLoading);
      }}
      onSignInPress={() => {
        navigation.navigate('SignIn');
      }}
    />
  );
};
