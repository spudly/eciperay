import {errorMessage} from '@eciperay/client';
import {useState} from 'react';
import {Alert} from 'react-native';
import {SignInPage} from '@spudly/ui/pages';

import {api} from '../../lib/api';
import {
  normalizeAuthEmail,
  normalizeAuthPassword,
} from '../../lib/normalizeAuthInput';
import {supabase} from '../../lib/supabase';

type SignInProps = {navigation: {navigate: (screen: string) => void}};

const signIn = async (email: string, password: string) => {
  const {error} = await supabase.auth.signInWithPassword({email, password});
  if (error) {
    throw error;
  }
  await api.auth.syncUser();
};

export const SignInScreen = ({navigation}: SignInProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signIn(normalizeAuthEmail(email), normalizeAuthPassword(password));
    } catch (error) {
      Alert.alert('Sign in failed', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SignInPage
      email={email}
      password={password}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      loading={loading}
      onSubmit={() => {
        void handleSignIn();
      }}
      onSignUpPress={() => {
        navigation.navigate('SignUp');
      }}
      onForgotPasswordPress={() => {
        navigation.navigate('ForgotPassword');
      }}
    />
  );
};
