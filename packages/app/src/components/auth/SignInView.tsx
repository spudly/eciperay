import type {SignInViewProps} from '@eciperay/client';
import {useState} from 'react';

import {AuthScreenLayout} from '../ui/AuthScreenLayout';
import {ErrorText} from '../ui/ErrorText';
import {PageTitle} from '../ui/PageTitle';
import {PrimaryButton} from '../ui/PrimaryButton';
import {TextField} from '../ui/TextField';
import {TextLinkButton} from '../ui/TextLinkButton';

const SIGN_IN_TITLE = 'Welcome back';

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
}: SignInViewProps) => (
  <AuthScreenLayout>
    <PageTitle
      size="auth"
      spacing="auth"
    >
      {SIGN_IN_TITLE}
    </PageTitle>
    <TextField
      autoComplete="email"
      label="Email"
      onChange={onEmailChange}
      type="email"
      value={email}
    />
    <TextField
      autoComplete="password"
      label="Password"
      onChange={onPasswordChange}
      type="password"
      value={password}
    />
    {error ? <ErrorText>{error}</ErrorText> : null}
    <PrimaryButton
      label="Sign In"
      loading={loading}
      loadingLabel="Signing in…"
      onPress={onSubmit}
    />
    <TextLinkButton
      label="Create an account"
      onPress={onSignUpPress}
    />
    <TextLinkButton
      label="Forgot password?"
      onPress={onForgotPasswordPress}
      variant="muted"
    />
  </AuthScreenLayout>
);

if (__DEV__) {
  const SignInViewDemo = () => {
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
        onSignUpPress={() => {
          void 0;
        }}
        onForgotPasswordPress={() => {
          void 0;
        }}
      />
    );
  };

  SignInView.demo = () => <SignInViewDemo />;
}
