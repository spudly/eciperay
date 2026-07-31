import type {SecondaryButtonProps} from '@eciperay/client';
import {Text, TouchableOpacity} from 'react-native';

export const SecondaryButton = ({
  label,
  onPress,
  disabled = false,
}: SecondaryButtonProps) => (
  <TouchableOpacity
    className="ui-secondary-button"
    disabled={disabled}
    onPress={onPress}
  >
    <Text className="ui-secondary-button-text">{label}</Text>
  </TouchableOpacity>
);

if (__DEV__) {
  SecondaryButton.demo = () => (
    <SecondaryButton
      label="Secondary"
      onPress={() => {
        void 0;
      }}
    />
  );
}
