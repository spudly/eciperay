import type {ProgressDotsProps} from '@eciperay/client';
import {StepDots as DSStepDots} from '@spudly/ui';

export const ProgressDots = ({total, current}: ProgressDotsProps) => (
  <DSStepDots
    count={total}
    activeIndex={current}
  />
);

if (import.meta.env.DEV) {
  ProgressDots.demo = function ProgressDotsDemo() {
    return (
      <ProgressDots
        total={5}
        current={2}
      />
    );
  };
}
