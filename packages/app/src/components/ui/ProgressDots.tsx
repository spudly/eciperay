import type {ProgressDotsProps} from '@eciperay/client';
import {StepDots, tokens} from '@spudly/ui';
import {View} from 'tamagui';

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
    <View
      backgroundColor={tokens.colors.gray.gray9}
      padding="$4"
    >
      <ProgressDots
        total={5}
        current={2}
      />
    </View>
  );
}
