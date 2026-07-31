import {errorMessage, useAuth} from '@eciperay/client';
import {useState} from 'react';
import {Navigate} from 'react-router-dom';

import {SignUpView} from '../../components/auth/SignUpView.js';
import {eciperay} from '../../lib/api.js';
import {supabase} from '../../lib/supabase.js';

export const SignupPage = () => {
  const {session, isLoading} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  if (!isLoading && session) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    try {
      const {data, error: signUpError} = await supabase.auth.signUp({
        email,
        password,
        options: {data: {display_name: displayName}},
      });
      if (signUpError) {
        throw signUpError;
      }
      if (data.session) {
        await eciperay.auth.syncUser();
      } else {
        setConfirmationSent(true);
      }
    } catch (error_) {
      setError(errorMessage(error_));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SignUpView
      displayName={displayName}
      email={email}
      password={password}
      onDisplayNameChange={setDisplayName}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      loading={loading}
      error={error}
      confirmationSent={confirmationSent}
      onSubmit={() => {
        void handleSignUp();
      }}
      signInTo="/login"
    />
  );
};
