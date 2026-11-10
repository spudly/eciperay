import {errorMessage, validateAuthEmail} from '@eciperay/client';
import {useState} from 'react';
import {Alert} from 'react-native';
import {SignInPage} from '@spudly/ui';

import {api} from '../../lib/api';
import {forgotPasswordHref, signUpHref} from '../../lib/deepLinks';
import {
  normalizeAuthEmail,
  normalizeAuthPassword,
} from '../../lib/normalizeAuthInput';
import {supabase} from '../../lib/supabase';

const signIn = async (email: string, password: string) => {
  const {error} = await supabase.auth.signInWithPassword({email, password});
  if (error) {
    throw error;
  }
  await api.auth.syncUser();
};

export const SignInScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSignIn = async () => {
    const validationError = validateAuthEmail(email);
    if (validationError) {
      setEmailError(validationError);
      return;
    }
    setEmailError(null);
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
      onEmailChange={value => {
        setEmail(value);
        setEmailError(null);
      }}
      onPasswordChange={setPassword}
      loading={loading}
      emailError={emailError}
      onSubmit={() => {
        void handleSignIn();
      }}
      signUpHref={signUpHref}
      forgotPasswordHref={forgotPasswordHref}
    />
  );
};
