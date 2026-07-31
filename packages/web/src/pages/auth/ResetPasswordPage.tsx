import {errorMessage, useAuth} from '@eciperay/client';
import {useState} from 'react';
import {Navigate, useNavigate} from 'react-router-dom';

import {ResetPasswordView} from '../../components/auth/ResetPasswordView.js';
import {supabase} from '../../lib/supabase.js';

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

  return (
    <ResetPasswordView
      password={password}
      onPasswordChange={setPassword}
      loading={loading}
      error={error}
      done={done}
      onSubmit={() => {
        void handleSubmit();
      }}
    />
  );
};
