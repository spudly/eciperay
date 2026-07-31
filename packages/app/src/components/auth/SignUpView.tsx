import type {SignUpViewProps} from '@eciperay/client';
import {useState} from 'react';

import {LegalLinks} from '../LegalLinks';
import {AuthScreenLayout} from '../ui/AuthScreenLayout';
import {ErrorText} from '../ui/ErrorText';
import {PageTitle} from '../ui/PageTitle';
import {PrimaryButton} from '../ui/PrimaryButton';
import {TextField} from '../ui/TextField';
import {TextLinkButton} from '../ui/TextLinkButton';

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
}: SignUpViewProps) => (
  <AuthScreenLayout>
    <PageTitle
      size="auth"
      spacing="auth"
    >
      Create account
    </PageTitle>
    <TextField
      label="Your name"
      onChange={onDisplayNameChange}
      value={displayName}
    />
    <TextField
      autoComplete="email"
      label="Email"
      onChange={onEmailChange}
      type="email"
      value={email}
    />
    <TextField
      autoComplete="password-new"
      label="Password"
      onChange={onPasswordChange}
      type="password"
      value={password}
    />
    {error ? <ErrorText>{error}</ErrorText> : null}
    <PrimaryButton
      label="Create Account"
      loading={loading}
      loadingLabel="Creating account…"
      onPress={onSubmit}
    />
    <LegalLinks variant="inline" />
    <TextLinkButton
      label="Already have an account? Sign in"
      onPress={onSignInPress}
    />
  </AuthScreenLayout>
);

if (__DEV__) {
  const SignUpViewDemo = () => {
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
        onSignInPress={() => {
          void 0;
        }}
      />
    );
  };

  SignUpView.demo = () => <SignUpViewDemo />;
}
