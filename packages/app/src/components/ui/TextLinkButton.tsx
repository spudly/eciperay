import type {TextLinkButtonProps} from '@eciperay/client';
import clsx from 'clsx';
import {Text, TouchableOpacity} from 'react-native';

export const TextLinkButton = ({
  label,
  onPress,
  variant = 'primary',
}: TextLinkButtonProps) => (
  <TouchableOpacity
    className={clsx('items-center', variant === 'primary' ? 'mt-4' : 'mt-2')}
    onPress={onPress}
  >
    <Text
      className={clsx(
        variant === 'primary' ? 'text-primary text-base' : 'text-muted text-sm',
      )}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

if (__DEV__) {
  TextLinkButton.demo = () => (
    <TextLinkButton
      label="Text link"
      onPress={() => {
        void 0;
      }}
    />
  );
}
