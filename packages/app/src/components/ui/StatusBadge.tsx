import type {StatusBadgeProps} from '@eciperay/client';
import {Badge} from '@spudly/ui';

type BadgeTone = 'danger' | 'info' | 'neutral' | 'success' | 'warning';

/**
 * The legacy `variant` prop is a Tailwind class string (e.g.
 * "bg-blue-100 text-blue-800"); map it to the closest DS Badge tone.
 */
const toneForVariant = (variant: string): BadgeTone => {
  const normalized = variant.toLowerCase();

  if (
    normalized.includes('green') ||
    normalized.includes('emerald') ||
    normalized.includes('success')
  ) {
    return 'success';
  }
  if (
    normalized.includes('red') ||
    normalized.includes('rose') ||
    normalized.includes('danger')
  ) {
    return 'danger';
  }
  if (
    normalized.includes('yellow') ||
    normalized.includes('amber') ||
    normalized.includes('orange') ||
    normalized.includes('warning')
  ) {
    return 'warning';
  }
  if (
    normalized.includes('blue') ||
    normalized.includes('indigo') ||
    normalized.includes('sky') ||
    normalized.includes('info')
  ) {
    return 'info';
  }

  return 'neutral';
};

export const StatusBadge = ({label, variant}: StatusBadgeProps) => (
  <Badge tone={toneForVariant(variant)}>{label}</Badge>
);

if (__DEV__) {
  StatusBadge.demo = () => (
    <StatusBadge
      label="Evolving"
      variant="bg-blue-100 text-blue-800"
    />
  );
}
