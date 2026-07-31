import type {ProgressDotsProps} from '@eciperay/client';
import clsx from 'clsx';
import {View} from 'react-native';

export const ProgressDots = ({
  total,
  current,
  variant = 'dark',
}: ProgressDotsProps) => (
  <View className="ui-progress-dots flex-row">
    {Array.from({length: total}).map((_, index) => (
      <View
        key={index}
        className={clsx('size-2 rounded-full', {
          'bg-white': variant === 'dark' && index === current,
          'bg-white/40': variant === 'dark' && index !== current,
          'bg-primary': variant === 'light' && index === current,
          'bg-gray-300': variant === 'light' && index !== current,
        })}
      />
    ))}
  </View>
);

if (__DEV__) {
  ProgressDots.demo = () => (
    <View className="bg-gray-900 p-4">
      <ProgressDots
        total={5}
        current={2}
      />
    </View>
  );
}
