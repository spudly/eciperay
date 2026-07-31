import type {StatBadgeProps, StatBadgeRowProps} from '@eciperay/client';
import {Text, View} from 'react-native';

export const StatBadge = ({label, value}: StatBadgeProps) => (
  <View className="ui-stat-badge items-center">
    <Text className="text-base font-semibold text-gray-900">{value}</Text>
    <Text className="text-muted text-xs">{label}</Text>
  </View>
);

export const StatBadgeRow = ({children}: StatBadgeRowProps) => (
  <View className="ui-stat-badge-row mb-4 flex-row">{children}</View>
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
