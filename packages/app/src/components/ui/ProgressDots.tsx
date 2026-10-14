import type {ProgressDotsProps} from '@eciperay/client';
import {StepDots} from '@spudly/ui';
import {View} from 'react-native';

// Note: the legacy `variant` prop ('dark' | 'light') is accepted but not
// forwarded — DS StepDots has a single dot style.
export const ProgressDots = ({total, current}: ProgressDotsProps) => (
  <StepDots
    count={total}
    activeIndex={current}
  />
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
