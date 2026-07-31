import type {DestructiveButtonProps} from '@eciperay/client';
import {Text, TouchableOpacity} from 'react-native';

export const DestructiveButton = ({
  label,
  onPress,
  disabled = false,
}: DestructiveButtonProps) => (
  <TouchableOpacity
    className="ui-destructive-button"
    disabled={disabled}
    onPress={onPress}
  >
    <Text className="ui-primary-button-text">{label}</Text>
  </TouchableOpacity>
);

if (__DEV__) {
  DestructiveButton.demo = () => (
    <DestructiveButton
      label="Destructive"
      onPress={() => {
        void 0;
      }}
    />
  );
}
