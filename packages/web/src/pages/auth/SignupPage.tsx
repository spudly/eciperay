import {errorMessage, useAuth} from '@eciperay/client';
import {useState} from 'react';
import {Navigate, useNavigate} from 'react-router-dom';

import {SignUpPage as SignUpPageView} from '@spudly/ui/pages';

import {LegalLinks} from '../../components/LegalLinks.js';
import {eciperay} from '../../lib/api.js';
import {supabase} from '../../lib/supabase.js';

import {AuthConfirmation} from './AuthConfirmation.js';

export const SignupPage = () => {
  const {session, isLoading} = useAuth();
  const navigate = useNavigate();
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

  if (confirmationSent) {
    return (
      <AuthConfirmation
        title="Check your email"
        body={`We sent a confirmation link to ${email}. Sign in after confirming.`}
        backLabel="Back to sign in"
        onBackPress={() => {
          void navigate('/login');
        }}
      />
    );
  }

  return (
    <SignUpPageView
      displayName={displayName}
      email={email}
      password={password}
      onDisplayNameChange={setDisplayName}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      loading={loading}
      error={error}
      onSubmit={() => {
        void handleSignUp();
      }}
      onSignInPress={() => {
        void navigate('/login');
      }}
      legalNotice={<LegalLinks className="mbs-6" />}
    />
  );
};
