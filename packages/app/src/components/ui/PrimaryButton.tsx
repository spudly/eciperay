import type {PrimaryButtonProps} from '@eciperay/client';
import {Text, TouchableOpacity} from 'react-native';

export const PrimaryButton = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  loadingLabel,
}: PrimaryButtonProps) => (
  <TouchableOpacity
    className="ui-primary-button"
    disabled={disabled || loading}
    onPress={onPress}
  >
    <Text className="ui-primary-button-text">
      {loading ? (loadingLabel ?? label) : label}
    </Text>
  </TouchableOpacity>
);

if (__DEV__) {
  PrimaryButton.demo = () => (
    <PrimaryButton
      label="Primary"
      onPress={() => {
        void 0;
      }}
    />
  );
}
