import {errorMessage} from '@eciperay/client';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {ForgotPasswordPage as ForgotPasswordPageView} from '@spudly/ui/pages';

import {supabase} from '../../lib/supabase.js';

import {AuthConfirmation} from './AuthConfirmation.js';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const {error: resetError} = await supabase.auth.resetPasswordForEmail(
        email,
        {redirectTo: `${window.location.origin}/reset-password`},
      );
      if (resetError) {
        throw resetError;
      }
      setSent(true);
    } catch (error_) {
      setError(errorMessage(error_));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthConfirmation
        title="Email sent"
        body="Check your inbox for a password reset link."
        backLabel="Back to sign in"
        onBackPress={() => {
          void navigate('/login');
        }}
      />
    );
  }

  return (
    <ForgotPasswordPageView
      email={email}
      onEmailChange={setEmail}
      loading={loading}
      error={error}
      onSubmit={() => {
        void handleSubmit();
      }}
      signInHref="/login"
    />
  );
};
