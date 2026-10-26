import type {PrevNextNavProps} from '@eciperay/client';
import {PrevNextNav as DSPrevNextNav} from '@spudly/ui';

// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
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
