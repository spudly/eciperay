import type {EmptyMessageProps} from '@eciperay/client';
import clsx from 'clsx';
import {Text} from 'react-native';

export const EmptyMessage = ({
  children,
  spacing = 'default',
}: EmptyMessageProps) => (
  <Text
    className={clsx(
      'ui-empty-message',
      spacing === 'list' ? 'mt-8' : undefined,
    )}
  >
    {children}
  </Text>
);

if (__DEV__) {
  EmptyMessage.demo = () => (
    <EmptyMessage spacing="list">Nothing here yet.</EmptyMessage>
  );
}
