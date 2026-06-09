import {errorMessage, useAuth} from '@recipoo/client';
import {useState} from 'react';
import {Link, Navigate} from 'react-router-dom';

import {recipoo} from '../../lib/api.js';
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

  const handleSignIn = async (e: React.SubmitEvent) => {
    e.preventDefault();
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
      await recipoo.auth.syncUser();
    } catch (error_) {
      setError(errorMessage(error_));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 pt-20">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Welcome back</h1>
      <form
        onSubmit={e => {
          void handleSignIn(e);
        }}
        className="space-y-4"
      >
        <input
          className="
            w-full rounded-lg border border-gray-300 px-4 py-3 text-base
          "
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => {
            setEmail(e.target.value);
          }}
          autoComplete="email"
        />
        <input
          className="
            w-full rounded-lg border border-gray-300 px-4 py-3 text-base
          "
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => {
            setPassword(e.target.value);
          }}
          autoComplete="current-password"
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
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
      <Link
        to="/signup"
        className="text-primary mt-4 block text-center text-base"
      >
        Create an account
      </Link>
      <Link
        to="/forgot-password"
        className="text-muted mt-2 block text-center text-sm"
      >
        Forgot password?
      </Link>
    </div>
  );
};
