import type {StatusBadgeProps} from '@eciperay/client';
import clsx from 'clsx';

export const StatusBadge = ({label, variant}: StatusBadgeProps) => (
  <span className={clsx('ui-status-badge text-xs font-medium', variant)}>
    {label}
  </span>
);

if (import.meta.env.DEV) {
  StatusBadge.demo = function StatusBadgeDemo() {
    return (
      <StatusBadge
        label="Evolving"
        variant="bg-blue-100 text-blue-800"
      />
    );
  };
}
