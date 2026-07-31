import type {EmptyMessageProps} from '@eciperay/client';
import clsx from 'clsx';

export const EmptyMessage = ({
  children,
  spacing = 'default',
}: EmptyMessageProps) => (
  <p
    className={clsx(
      'ui-empty-message',
      spacing === 'list' ? 'mt-8' : undefined,
    )}
  >
    {children}
  </p>
);

if (import.meta.env.DEV) {
  EmptyMessage.demo = function EmptyMessageDemo() {
    return <EmptyMessage spacing="list">Nothing here yet.</EmptyMessage>;
  };
}
