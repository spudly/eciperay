import {errorMessage, useAuth} from '@eciperay/client';
import {useLingui} from '@lingui/react';
import {useState} from 'react';
import {Navigate, useNavigate} from 'react-router-dom';

import {ResetPasswordPage as ResetPasswordPageView} from '@spudly/ui';

import {supabase} from '../../lib/supabase.js';

import {AuthConfirmation} from './AuthConfirmation.js';

// The confirmation state's copy is page-unique and flows through the
// Lingui catalogs (#465 tranche 19: explicit ids
// `resetPassword.confirmationTitle` / `resetPassword.confirmationBody`);
// the form itself is rendered by the design system's ResetPasswordPage,
// whose copy is DS-owned.
export const ResetPasswordPage = () => {
  const {i18n} = useLingui();
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
        title={i18n._({
          id: 'resetPassword.confirmationTitle',
          message: 'Password updated',
        })}
        body={i18n._({
          id: 'resetPassword.confirmationBody',
          message: 'Redirecting…',
        })}
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
