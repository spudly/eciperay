import type {PrevNextNavProps} from '@eciperay/client';
import {PrevNextNav as DSPrevNextNav, tokens} from '@spudly/ui';
import {View} from 'tamagui';

// Note: DS PrevNextNav has no disabled-back state, so `disableBack` hides the
// back button (the DS convention when there is nowhere to go back to).
export const PrevNextNav = ({
  onBack,
  onNext,
  backLabel = '← Back',
  nextLabel = 'Next →',
  disableBack = false,
  disableNext = false,
}: PrevNextNavProps) => (
  <DSPrevNextNav
    onBack={disableBack ? undefined : onBack}
    onNext={onNext}
    backLabel={backLabel}
    nextLabel={nextLabel}
    nextDisabled={disableNext}
  />
);
