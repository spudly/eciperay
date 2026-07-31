import type {SectionCardProps} from '@eciperay/client';
import clsx from 'clsx';
import {Text, View} from 'react-native';

const variantClass: Record<NonNullable<SectionCardProps['variant']>, string> = {
  elevated: 'ui-section-card',
  bordered: 'ui-section-card-bordered',
  muted: 'ui-section-card-muted',
};

export const SectionCard = ({
  title,
  description,
  variant = 'elevated',
  children,
}: SectionCardProps) => (
  <View className={clsx('mb-8', variantClass[variant])}>
    <Text className="ui-section-card-title mb-1">{title}</Text>
    {description ? (
      <Text className="text-muted mb-3 text-sm">{description}</Text>
    ) : null}
    {children}
  </View>
);

if (__DEV__) {
  SectionCard.demo = () => (
    <SectionCard title="Preferences">
      <Text className="text-sm text-gray-700">Card content goes here.</Text>
    </SectionCard>
  );
}
