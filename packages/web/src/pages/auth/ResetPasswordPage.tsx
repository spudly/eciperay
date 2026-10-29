import {errorMessage, useAuth} from '@eciperay/client';
import {useState} from 'react';
import {Navigate, useNavigate} from 'react-router-dom';

import {ResetPasswordPage as ResetPasswordPageView} from '@spudly/ui/pages';

import {supabase} from '../../lib/supabase.js';

import {AuthConfirmation} from './AuthConfirmation.js';

export const ResetPasswordPage = () => {
  const {session, isLoading} = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!isLoading && !session) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const {error: updateError} = await supabase.auth.updateUser({password});
      if (updateError) {
        throw updateError;
      }
      setDone(true);
      setTimeout(() => {
        void navigate('/');
      }, 2000);
    } catch (error_) {
      setError(errorMessage(error_));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthConfirmation
        title="Password updated"
        body="Redirecting…"
      />
    );
  }

  return (
    <ResetPasswordPageView
      password={password}
      onPasswordChange={setPassword}
      loading={loading}
      error={error}
      onSubmit={() => {
        void handleSubmit();
      }}
    />
  );
};
