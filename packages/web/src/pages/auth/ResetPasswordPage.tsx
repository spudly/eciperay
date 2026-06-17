import {errorMessage, useAuth} from '@eciperay/client';
import {useState} from 'react';
import {Navigate, useNavigate} from 'react-router-dom';

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

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
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
      <div className="mx-auto max-w-md px-6 pt-20 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          Password updated
        </h1>
        <p className="text-muted">Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 pt-20">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">New password</h1>
      <form
        onSubmit={e => {
          void handleSubmit(e);
        }}
        className="space-y-4"
      >
        <input
          className="
            w-full rounded-lg border border-gray-300 px-4 py-3 text-base
          "
          placeholder="New password"
          type="password"
          value={password}
          onChange={e => {
            setPassword(e.target.value);
          }}
          autoComplete="new-password"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="
            bg-primary w-full rounded-lg py-4 text-base font-semibold text-white
            disabled:opacity-50
          "
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
};
