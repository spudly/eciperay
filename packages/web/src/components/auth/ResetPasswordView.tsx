import type {ResetPasswordViewProps} from '@eciperay/client';
import {useState} from 'react';

import {AuthScreenLayout} from '../ui/AuthScreenLayout.js';
import {ErrorText} from '../ui/ErrorText.js';
import {PageTitle} from '../ui/PageTitle.js';
import {PrimaryButton} from '../ui/PrimaryButton.js';
import {TextField} from '../ui/TextField.js';

export const ResetPasswordView = ({
  password,
  onPasswordChange,
  loading,
  error,
  onSubmit,
  done = false,
}: ResetPasswordViewProps) => {
  if (done) {
    return (
      <AuthScreenLayout>
        <div className="text-center">
          <PageTitle
            size="section"
            spacing="section"
          >
            Password updated
          </PageTitle>
          <p className="text-muted">Redirecting…</p>
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
        New password
      </PageTitle>
      <form
        className="ui-auth-form-stack"
        onSubmit={e => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <TextField
          autoComplete="new-password"
          onChange={onPasswordChange}
          placeholder="New password"
          type="password"
          value={password}
        />
        {error ? <ErrorText>{error}</ErrorText> : null}
        <PrimaryButton
          label="Update password"
          loading={loading}
          loadingLabel="Updating…"
          onPress={onSubmit}
          type="submit"
        />
      </form>
    </AuthScreenLayout>
  );
};

if (import.meta.env.DEV) {
  ResetPasswordView.demo = function ResetPasswordViewDemo() {
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
}
