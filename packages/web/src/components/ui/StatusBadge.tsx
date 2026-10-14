import type {StatusBadgeProps} from '@eciperay/client';
import {Badge as DSBadge} from '@spudly/ui';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/**
 * Maps the legacy Tailwind color classes used for `variant` to the
 * design-system Badge tone.
 */
const toneForVariant = (variant: string): Tone => {
  const v = variant.toLowerCase();
  if (v.includes('blue')) {
    return 'info';
  }
  if (v.includes('green')) {
    return 'success';
  }
  if (v.includes('red')) {
    return 'danger';
  }
  if (v.includes('yellow') || v.includes('amber') || v.includes('orange')) {
    return 'warning';
  }
  return 'neutral';
};

export const StatusBadge = ({label, variant}: StatusBadgeProps) => (
  <DSBadge tone={toneForVariant(variant)}>{label}</DSBadge>
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
