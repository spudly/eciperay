import type {SignInViewProps} from '@eciperay/client';
import {useState} from 'react';

import {LegalLinks} from '../LegalLinks.js';
import {AuthScreenLayout} from '../ui/AuthScreenLayout.js';
import {ErrorText} from '../ui/ErrorText.js';
import {PageTitle} from '../ui/PageTitle.js';
import {PrimaryButton} from '../ui/PrimaryButton.js';
import {TextField} from '../ui/TextField.js';
import {TextLinkButton} from '../ui/TextLinkButton.js';

export const SignInView = ({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  loading,
  error,
  onSubmit,
  onSignUpPress,
  onForgotPasswordPress,
  signUpTo,
  forgotPasswordTo,
}: SignInViewProps) => (
  <AuthScreenLayout>
    <PageTitle
      size="auth"
      spacing="auth"
    >
      Welcome back
    </PageTitle>
    <form style={{display: 'flex', flexDirection: 'column', gap: 16}}
      onSubmit={e => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <TextField
        autoComplete="email"
        onChange={onEmailChange}
        placeholder="Email"
        type="email"
        value={email}
      />
      <TextField
        autoComplete="current-password"
        onChange={onPasswordChange}
        placeholder="Password"
        type="password"
        value={password}
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <PrimaryButton
        label="Sign In"
        loading={loading}
        loadingLabel="Signing in…"
        onPress={onSubmit}
        type="submit"
      />
    </form>
    <TextLinkButton
      label="Create an account"
      onPress={onSignUpPress}
      to={signUpTo}
    />
    <TextLinkButton
      label="Forgot password?"
      onPress={onForgotPasswordPress}
      to={forgotPasswordTo}
      variant="muted"
    />
    <LegalLinks
      className="mbs-6"
      variant="stacked"
    />
  </AuthScreenLayout>
);

if (import.meta.env.DEV) {
  SignInView.demo = function SignInViewDemo() {
    const [email, setEmail] = useState('chef@example.com');
    const [password, setPassword] = useState('secret');

    return (
      <SignInView
        email={email}
        password={password}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        loading={false}
        onSubmit={() => {
          void 0;
        }}
        signUpTo="/signup"
        forgotPasswordTo="/forgot-password"
      />
    );
  };
}
