import type {StatusBadgeProps} from '@eciperay/client';
import clsx from 'clsx';
import {Text, View} from 'react-native';

export const StatusBadge = ({label, variant}: StatusBadgeProps) => (
  <View className={clsx('ui-status-badge', variant)}>
    <Text className="text-xs font-medium">{label}</Text>
  </View>
);

if (__DEV__) {
  StatusBadge.demo = () => (
    <StatusBadge
      label="Evolving"
      variant="bg-blue-100 text-blue-800"
    />
  );
}
