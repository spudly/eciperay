import type {SignUpViewProps} from '@eciperay/client';
import {useState} from 'react';

import {LegalLinks} from '../LegalLinks.js';
import {AuthScreenLayout} from '../ui/AuthScreenLayout.js';
import {ErrorText} from '../ui/ErrorText.js';
import {PageTitle} from '../ui/PageTitle.js';
import {PrimaryButton} from '../ui/PrimaryButton.js';
import {TextField} from '../ui/TextField.js';
import {TextLinkButton} from '../ui/TextLinkButton.js';

export const SignUpView = ({
  displayName,
  email,
  password,
  onDisplayNameChange,
  onEmailChange,
  onPasswordChange,
  loading,
  error,
  onSubmit,
  onSignInPress,
  confirmationSent = false,
  signInTo,
}: SignUpViewProps) => {
  if (confirmationSent) {
    return (
      <AuthScreenLayout>
        <div className="text-center">
          <PageTitle
            size="section"
            spacing="section"
          >
            Check your email
          </PageTitle>
          <p className="text-muted">
            We sent a confirmation link to {email}. Sign in after confirming.
          </p>
          <TextLinkButton
            label="Back to sign in"
            onPress={onSignInPress}
            to={signInTo}
          />
        </div>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout>
      <PageTitle
        size="auth"
        spacing="auth"
      >
        Create account
      </PageTitle>
      <form style={{display: 'flex', flexDirection: 'column', gap: 16}}
        onSubmit={e => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <TextField
          onChange={onDisplayNameChange}
          placeholder="Display name"
          value={displayName}
        />
        <TextField
          autoComplete="email"
          onChange={onEmailChange}
          placeholder="Email"
          type="email"
          value={email}
        />
        <TextField
          autoComplete="new-password"
          onChange={onPasswordChange}
          placeholder="Password"
          type="password"
          value={password}
        />
        {error ? <ErrorText>{error}</ErrorText> : null}
        <PrimaryButton
          label="Sign Up"
          loading={loading}
          loadingLabel="Creating account…"
          onPress={onSubmit}
          type="submit"
        />
      </form>
      <LegalLinks className="mbs-6" />
      <TextLinkButton
        label="Already have an account?"
        onPress={onSignInPress}
        to={signInTo}
      />
    </AuthScreenLayout>
  );
};

if (import.meta.env.DEV) {
  SignUpView.demo = function SignUpViewDemo() {
    const [displayName, setDisplayName] = useState('Chef');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
      <SignUpView
        displayName={displayName}
        email={email}
        password={password}
        onDisplayNameChange={setDisplayName}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        loading={false}
        onSubmit={() => {
          void 0;
        }}
        signInTo="/login"
      />
    );
  };
}
