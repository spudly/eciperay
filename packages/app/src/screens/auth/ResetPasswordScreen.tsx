import {errorMessage} from '@eciperay/client';
import {useLingui} from '@lingui/react';
import {useState} from 'react';
import {Alert} from 'react-native';
import {ResetPasswordPage} from '@spudly/ui';

import {normalizeAuthPassword} from '../../lib/normalizeAuthInput';
import {supabase} from '../../lib/supabase';

type ResetPasswordProps = {onComplete: () => void};

export const ResetPasswordScreen = ({onComplete}: ResetPasswordProps) => {
  const {i18n} = useLingui();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const {error} = await supabase.auth.updateUser({
        password: normalizeAuthPassword(password),
      });
      if (error) {
        throw error;
      }
      onComplete();
      Alert.alert(
        i18n._({
          id: 'resetPassword.confirmationTitle',
          message: 'Password updated',
        }),
        i18n._({
          id: 'resetPassword.confirmationBody',
          message: 'Your new password is set — use it to sign in from here on.',
        }),
      );
    } catch (error) {
      Alert.alert(
        i18n._({id: 'authNative.errorTitle', message: 'Error'}),
        errorMessage(error),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResetPasswordPage
      password={password}
      onPasswordChange={setPassword}
      loading={loading}
      onSubmit={() => {
        void handleSubmit();
      }}
    />
  );
};
