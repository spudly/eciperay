import type {EmptyMessageProps} from '@eciperay/client';
import {Text as DsText, tokens} from '@spudly/ui';

export const EmptyMessage = ({
  children,
  spacing = 'default',
}: EmptyMessageProps) => (
  <DsText
    textAlign="center"
    marginTop={spacing === 'list' ? tokens.spacing[8] : undefined}
  >
    {children}
  </DsText>
);

if (__DEV__) {
  EmptyMessage.demo = () => (
    <EmptyMessage spacing="list">Nothing here yet.</EmptyMessage>
  );
}
