import {errorMessage, useAuth} from '@eciperay/client';
import {useState} from 'react';
import {Navigate} from 'react-router-dom';

import {SignInView} from '../../components/auth/SignInView.js';
import {eciperay} from '../../lib/api.js';
import {supabase} from '../../lib/supabase.js';

export const LoginPage = () => {
  const {session, isLoading} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoading && session) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const {error: signInError} = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        throw signInError;
      }
      await eciperay.auth.syncUser();
    } catch (error_) {
      setError(errorMessage(error_));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SignInView
      email={email}
      password={password}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      loading={loading}
      error={error}
      onSubmit={() => {
        void handleSignIn();
      }}
      signUpTo="/signup"
      forgotPasswordTo="/forgot-password"
    />
  );
};
