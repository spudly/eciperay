import type {EmptyMessageProps} from '@eciperay/client';
import {Text as DSText} from '@spudly/ui';
import {YStack} from 'tamagui';

export const EmptyMessage = ({
  children,
  spacing = 'default',
}: EmptyMessageProps) => (
  <YStack marginTop={spacing === 'list' ? '$8' : undefined} alignItems="center">
    <DSText variant="hint">{children}</DSText>
  </YStack>
);

if (import.meta.env.DEV) {
  EmptyMessage.demo = function EmptyMessageDemo() {
    return <EmptyMessage spacing="list">Nothing here yet.</EmptyMessage>;
  };
}
