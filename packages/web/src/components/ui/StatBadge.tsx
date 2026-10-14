import type {StatBadgeProps, StatBadgeRowProps} from '@eciperay/client';
import {StatCard as DSStatCard} from '@spudly/ui';
import {XStack} from 'tamagui';

export const StatBadge = ({label, value}: StatBadgeProps) => (
  <DSStatCard
    value={value}
    label={label}
  />
);

export const StatBadgeRow = ({children}: StatBadgeRowProps) => (
  <XStack gap="$3" marginBottom="$4">
    {children}
  </XStack>
);

if (import.meta.env.DEV) {
  StatBadge.demo = function StatBadgeDemo() {
    return (
      <StatBadgeRow>
        <StatBadge
          label="Servings"
          value="4"
        />
        <StatBadge
          label="Cook"
          value="30m"
        />
      </StatBadgeRow>
    );
  };
}
