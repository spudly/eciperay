import {errorMessage} from '@eciperay/client';
import {useState} from 'react';
import {Alert} from 'react-native';
import {ResetPasswordPage} from '@spudly/ui/pages';

import {normalizeAuthPassword} from '../../lib/normalizeAuthInput';
import {supabase} from '../../lib/supabase';

type ResetPasswordProps = {onComplete: () => void};

export const ResetPasswordScreen = ({onComplete}: ResetPasswordProps) => {
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
      Alert.alert('Password updated', 'You can now use your new password.');
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
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
