import {errorMessage, useAuth, validateAuthEmail} from '@eciperay/client';
import {useLingui} from '@lingui/react';
import {useState} from 'react';
import {Navigate, useNavigate} from 'react-router-dom';

import {SignUpPage as SignUpPageView} from '@spudly/ui';

import {LegalLinks} from '../../components/LegalLinks.js';
import {eciperay} from '../../lib/api.js';
import {supabase} from '../../lib/supabase.js';

import {AuthConfirmation} from './AuthConfirmation.js';

// The confirmation state's copy is page-unique and flows through the
// Lingui catalogs (#465 tranche 19: explicit ids
// `signup.confirmationTitle` / `signup.confirmationBody` /
// `signup.backLabel`); the form itself is rendered by the design
// system's SignUpPage, whose copy is DS-owned.
export const SignupPage = () => {
  const {i18n} = useLingui();
  const {session, isLoading} = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
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
    const validationError = validateAuthEmail(email);
    if (validationError) {
      setEmailError(validationError);
      return;
    }
    setEmailError(null);
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
        title={i18n._({
          id: 'signup.confirmationTitle',
          message: 'Check your email',
        })}
        body={i18n._({
          id: 'signup.confirmationBody',
          message:
            'A confirmation link is headed to {email} — confirm there, then sign in.',
          values: {email},
        })}
        backLabel={i18n._({id: 'signup.backLabel', message: 'Back to sign in'})}
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
      onEmailChange={value => {
        setEmail(value);
        setEmailError(null);
      }}
      onPasswordChange={setPassword}
      loading={loading}
      error={error}
      emailError={emailError}
      onSubmit={() => {
        void handleSignUp();
      }}
      signInHref="/login"
      legalNotice={
        <div style={{marginTop: 24}}>
          <LegalLinks />
        </div>
      }
    />
  );
};
