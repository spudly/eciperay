import type {ForgotPasswordViewProps} from '@eciperay/client';
import {Text} from 'react-native';
import {useState} from 'react';

import {AuthScreenLayout} from '../ui/AuthScreenLayout';
import {ErrorText} from '../ui/ErrorText';
import {PageTitle} from '../ui/PageTitle';
import {PrimaryButton} from '../ui/PrimaryButton';
import {TextField} from '../ui/TextField';
import {TextLinkButton} from '../ui/TextLinkButton';

export const ForgotPasswordView = ({
  email,
  onEmailChange,
  loading,
  error,
  onSubmit,
  onBackPress,
}: ForgotPasswordViewProps) => (
  <AuthScreenLayout>
    <PageTitle
      size="auth"
      spacing="section"
    >
      Reset password
    </PageTitle>
    <Text className="text-muted mbe-8">
      {"We'll send a reset link to your email."}
    </Text>
    <TextField
      autoComplete="email"
      label="Email"
      onChange={onEmailChange}
      type="email"
      value={email}
    />
    {error ? <ErrorText>{error}</ErrorText> : null}
    <PrimaryButton
      label="Send Reset Link"
      loading={loading}
      loadingLabel="Sending…"
      onPress={onSubmit}
    />
    {onBackPress ? (
      <TextLinkButton
        label="Back to sign in"
        onPress={onBackPress}
        variant="muted"
      />
    ) : null}
  </AuthScreenLayout>
);

if (__DEV__) {
  const ForgotPasswordViewDemo = () => {
    const [email, setEmail] = useState('chef@example.com');

    return (
      <ForgotPasswordView
        email={email}
        onEmailChange={setEmail}
        loading={false}
        onSubmit={() => {
          void 0;
        }}
        onBackPress={() => {
          void 0;
        }}
      />
    );
  };

  ForgotPasswordView.demo = () => <ForgotPasswordViewDemo />;
}
