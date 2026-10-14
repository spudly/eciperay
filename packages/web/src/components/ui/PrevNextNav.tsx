import type {PrevNextNavProps} from '@eciperay/client';
import {PrevNextNav as DSPrevNextNav} from '@spudly/ui';

export const PrevNextNav = ({
  onBack,
  onNext,
  backLabel = '← Back',
  nextLabel = 'Next →',
  disableBack,
  disableNext,
}: PrevNextNavProps) => (
  <DSPrevNextNav
    onBack={disableBack ? undefined : onBack}
    onNext={onNext}
    backLabel={backLabel}
    nextLabel={nextLabel}
    nextDisabled={disableNext}
  />
);
