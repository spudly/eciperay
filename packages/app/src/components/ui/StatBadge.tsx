import type {StatBadgeProps, StatBadgeRowProps} from '@eciperay/client';
import {StatCard, tokens} from '@spudly/ui';
import {XStack} from 'tamagui';

export const StatBadge = ({label, value}: StatBadgeProps) => (
  <StatCard
    label={label}
    value={value}
  />
);

/**
 * G5 (StatRow): composed in the adapter layer from DS primitives — a row of
 * StatCards spread across a recessed, rounded band (the old
 * ui-stat-badge-row).
 */
export const StatBadgeRow = ({children}: StatBadgeRowProps) => (
  <XStack
    justifyContent="space-around"
    backgroundColor={tokens.colors.gray.gray1}
    borderRadius={tokens.radii.lg}
    paddingVertical="$4"
    marginBlockEnd="$4"
  >
    {children}
  </XStack>
);

if (__DEV__) {
  StatBadge.demo = () => (
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
}
