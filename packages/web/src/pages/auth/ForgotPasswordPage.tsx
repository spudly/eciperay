import {errorMessage} from '@eciperay/client';
import {useState} from 'react';

import {ForgotPasswordView} from '../../components/auth/ForgotPasswordView.js';
import {supabase} from '../../lib/supabase.js';

export const ForgotPasswordPage = () => {
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

  return (
    <ForgotPasswordView
      email={email}
      onEmailChange={setEmail}
      loading={loading}
      error={error}
      sent={sent}
      onSubmit={() => {
        void handleSubmit();
      }}
      signInTo="/login"
    />
  );
};
