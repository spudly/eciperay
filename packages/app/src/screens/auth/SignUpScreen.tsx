import {errorMessage, validateAuthEmail} from '@eciperay/client';
import {useLingui} from '@lingui/react';
import {useState} from 'react';
import {Alert} from 'react-native';
import {SignUpPage} from '@spudly/ui';

import {AUTH_DEEP_LINK_REDIRECT_URL} from '../../lib/authDeepLink';
import {signInHref} from '../../lib/deepLinks';
import {LegalLinks} from '../../components/LegalLinks';
import {api} from '../../lib/api';
import {
  normalizeAuthEmail,
  normalizeAuthPassword,
} from '../../lib/normalizeAuthInput';
import {supabase} from '../../lib/supabase';

const signUp = async (email: string, password: string, displayName: string) => {
  const {data, error} = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {display_name: displayName},
      emailRedirectTo: AUTH_DEEP_LINK_REDIRECT_URL,
    },
  });
  if (error) {
    throw error;
  }
  if (data.session) {
    await api.auth.syncUser();
  } else {
    return 'confirm-email';
  }
};

const runSignUp = async (
  email: string,
  password: string,
  displayName: string,
  setLoading: (v: boolean) => void,
  setEmailError: (v: string | null) => void,
  messages: {
    confirmationTitle: string;
    confirmationBody: string;
    failedTitle: string;
  },
) => {
  const validationError = validateAuthEmail(email);
  if (validationError) {
    setEmailError(validationError);
    return;
  }
  setEmailError(null);
  setLoading(true);
  try {
    const result = await signUp(
      normalizeAuthEmail(email),
      normalizeAuthPassword(password),
      displayName.trim(),
    );
    if (result === 'confirm-email') {
      Alert.alert(messages.confirmationTitle, messages.confirmationBody);
    }
  } catch (error) {
    Alert.alert(messages.failedTitle, errorMessage(error));
  } finally {
    setLoading(false);
  }
};

export const SignUpScreen = () => {
  const {i18n} = useLingui();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  return (
    <SignUpPage
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
      emailError={emailError}
      onSubmit={() => {
        void runSignUp(email, password, displayName, setLoading, setEmailError, {
          confirmationTitle: i18n._({
            id: 'signup.confirmationTitle',
            message: 'Check your email',
          }),
          confirmationBody: i18n._({
            id: 'signup.confirmationBody',
            message: 'Click the confirmation link we sent you, then sign in — almost there.',
          }),
          failedTitle: i18n._({
            id: 'authNative.signUpFailedTitle',
            message: 'Sign up failed',
          }),
        });
      }}
      signInHref={signInHref}
      legalNotice={<LegalLinks variant="inline" />}
    />
  );
};
