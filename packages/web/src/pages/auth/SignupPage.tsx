import {errorMessage, useAuth} from '@recipoo/client';
import {useState} from 'react';
import {Link, Navigate} from 'react-router-dom';

import {recipoo} from '../../lib/api.js';
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

  const handleSignUp = async (e: React.SubmitEvent) => {
    e.preventDefault();
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
        await recipoo.auth.syncUser();
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
      <div className="mx-auto max-w-md px-6 pt-20 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          Check your email
        </h1>
        <p className="text-muted">
          We sent a confirmation link to {email}. Sign in after confirming.
        </p>
        <Link
          to="/login"
          className="text-primary mt-6 inline-block"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 pt-20">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Create account</h1>
      <form
        onSubmit={e => {
          void handleSignUp(e);
        }}
        className="space-y-4"
      >
        <input
          className="
            w-full rounded-lg border border-gray-300 px-4 py-3 text-base
          "
          placeholder="Display name"
          value={displayName}
          onChange={e => {
            setDisplayName(e.target.value);
          }}
        />
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
          {loading ? 'Creating account…' : 'Sign Up'}
        </button>
      </form>
      <Link
        to="/login"
        className="text-primary mt-4 block text-center text-base"
      >
        Already have an account?
      </Link>
    </div>
  );
};
