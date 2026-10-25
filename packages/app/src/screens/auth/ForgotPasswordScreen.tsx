import {errorMessage} from '@eciperay/client';
import {useState} from 'react';
import {Alert} from 'react-native';
import {ForgotPasswordPage} from '@spudly/ui/pages';

import {AUTH_DEEP_LINK_REDIRECT_URL} from '../../lib/authDeepLink';
import {normalizeAuthEmail} from '../../lib/normalizeAuthInput';
import {supabase} from '../../lib/supabase';

type ForgotProps = {navigation: {goBack: () => void}};

const sendReset = async (email: string) => {
  const {error} = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: AUTH_DEEP_LINK_REDIRECT_URL,
  });
  if (error) {
    throw error;
  }
};

export const ForgotPasswordScreen = ({navigation}: ForgotProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    try {
      await sendReset(normalizeAuthEmail(email));
      Alert.alert('Check your email', 'A password reset link has been sent.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ForgotPasswordPage
      email={email}
      onEmailChange={setEmail}
      loading={loading}
      onSubmit={() => {
        void handleReset();
      }}
      onBackPress={() => {
        navigation.goBack();
      }}
    />
  );
};
