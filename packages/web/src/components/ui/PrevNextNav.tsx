import type {PrevNextNavProps} from '@eciperay/client';
import clsx from 'clsx';

export const PrevNextNav = ({
  onBack,
  onNext,
  backLabel = '← Back',
  nextLabel = 'Next →',
  disableBack = false,
  disableNext = false,
}: PrevNextNavProps) => (
  <div className="ui-prev-next-nav flex">
    <button
      type="button"
      className={clsx('ui-prev-next-nav-button text-base text-white', {
        'opacity-30': disableBack,
      })}
      disabled={disableBack}
      onClick={onBack}
    >
      {backLabel}
    </button>
    <button
      type="button"
      className={clsx('ui-prev-next-nav-button text-base text-white', {
        'opacity-30': disableNext,
      })}
      disabled={disableNext}
      onClick={onNext}
    >
      {nextLabel}
    </button>
  </div>
);

if (import.meta.env.DEV) {
  PrevNextNav.demo = function PrevNextNavDemo() {
    return (
      <div className="bg-gray-900 p-4">
        <PrevNextNav
          onBack={() => {
            void 0;
          }}
          onNext={() => {
            void 0;
          }}
        />
      </div>
    );
  };
}
