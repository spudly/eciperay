import {errorMessage} from '@recipoo/client';
import {useState} from 'react';
import {Link} from 'react-router-dom';

import {supabase} from '../../lib/supabase.js';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
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
      <div className="mx-auto max-w-md px-6 pt-20 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Email sent</h1>
        <p className="text-muted">
          Check your inbox for a password reset link.
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
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Reset password</h1>
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
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => {
            setEmail(e.target.value);
          }}
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
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <Link
        to="/login"
        className="text-muted mt-4 block text-center text-sm"
      >
        Back to sign in
      </Link>
    </div>
  );
};
