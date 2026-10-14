import type {StatBadgeProps, StatBadgeRowProps} from '@eciperay/client';
import {StatCard} from '@spudly/ui';
import {View} from 'react-native';

export const StatBadge = ({label, value}: StatBadgeProps) => (
  <StatCard
    label={label}
    value={value}
  />
);

export const StatBadgeRow = ({children}: StatBadgeRowProps) => (
  <View className="ui-stat-badge-row mbe-4 flex-row">{children}</View>
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
