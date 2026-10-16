import type {ResetPasswordViewProps} from '@eciperay/client';
import {Text as DsText} from '@spudly/ui';
import {useState} from 'react';

import {AuthScreenLayout} from '../ui/AuthScreenLayout';
import {ErrorText} from '../ui/ErrorText';
import {PageTitle} from '../ui/PageTitle';
import {PrimaryButton} from '../ui/PrimaryButton';
import {TextField} from '../ui/TextField';

export const ResetPasswordView = ({
  password,
  onPasswordChange,
  loading,
  error,
  onSubmit,
}: ResetPasswordViewProps) => (
  <AuthScreenLayout>
    <PageTitle
      size="auth"
      spacing="section"
    >
      New password
    </PageTitle>
    <DsText
      color="$textMuted"
      marginBlockEnd="$8"
    >
      Choose a new password for your account.
    </DsText>
    <TextField
      autoComplete="password-new"
      label="New password"
      onChange={onPasswordChange}
      type="password"
      value={password}
    />
    {error ? <ErrorText>{error}</ErrorText> : null}
    <PrimaryButton
      label="Update password"
      loading={loading}
      loadingLabel="Updating…"
      onPress={onSubmit}
    />
  </AuthScreenLayout>
);

if (__DEV__) {
  const ResetPasswordViewDemo = () => {
    const [password, setPassword] = useState('');

    return (
      <ResetPasswordView
        password={password}
        onPasswordChange={setPassword}
        loading={false}
        onSubmit={() => {
          void 0;
        }}
      />
    );
  };

  ResetPasswordView.demo = () => <ResetPasswordViewDemo />;
}
