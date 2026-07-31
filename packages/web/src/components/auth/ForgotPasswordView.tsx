import type {ForgotPasswordViewProps} from '@eciperay/client';
import {useState} from 'react';

import {AuthScreenLayout} from '../ui/AuthScreenLayout.js';
import {ErrorText} from '../ui/ErrorText.js';
import {PageTitle} from '../ui/PageTitle.js';
import {PrimaryButton} from '../ui/PrimaryButton.js';
import {TextField} from '../ui/TextField.js';
import {TextLinkButton} from '../ui/TextLinkButton.js';

export const ForgotPasswordView = ({
  email,
  onEmailChange,
  loading,
  error,
  onSubmit,
  onBackPress,
  sent = false,
  signInTo,
}: ForgotPasswordViewProps) => {
  if (sent) {
    return (
      <AuthScreenLayout>
        <div className="text-center">
          <PageTitle
            size="section"
            spacing="section"
          >
            Email sent
          </PageTitle>
          <p className="text-muted">
            Check your inbox for a password reset link.
          </p>
          <TextLinkButton
            label="Back to sign in"
            onPress={onBackPress}
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
        Reset password
      </PageTitle>
      <form
        className="ui-auth-form-stack"
        onSubmit={e => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <TextField
          onChange={onEmailChange}
          placeholder="Email"
          type="email"
          value={email}
        />
        {error ? <ErrorText>{error}</ErrorText> : null}
        <PrimaryButton
          label="Send reset link"
          loading={loading}
          loadingLabel="Sending…"
          onPress={onSubmit}
          type="submit"
        />
      </form>
      <TextLinkButton
        label="Back to sign in"
        onPress={onBackPress}
        to={signInTo}
        variant="muted"
      />
    </AuthScreenLayout>
  );
};

if (import.meta.env.DEV) {
  ForgotPasswordView.demo = function ForgotPasswordViewDemo() {
    const [email, setEmail] = useState('chef@example.com');

    return (
      <ForgotPasswordView
        email={email}
        onEmailChange={setEmail}
        loading={false}
        onSubmit={() => {
          void 0;
        }}
        signInTo="/login"
      />
    );
  };
}
