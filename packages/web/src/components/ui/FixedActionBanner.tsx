import type {FixedActionBannerProps} from '@eciperay/client';
import clsx from 'clsx';

export const FixedActionBanner = ({
  message,
  primaryAction,
  secondaryAction,
  onDismiss,
  dismissAriaLabel = 'Dismiss',
  position = 'bottom',
  ariaLabel,
  role,
}: FixedActionBannerProps) => (
  <div
    className={clsx(
      'ui-fixed-action-banner fixed inset-x-0 z-50',
      position === 'top'
        ? 'ui-fixed-action-banner-top top-0'
        : 'ui-fixed-action-banner-bottom bottom-0',
    )}
    role={role ?? (ariaLabel ? 'dialog' : 'region')}
    aria-label={ariaLabel}
  >
    <div
      className="
        mx-auto flex max-w-5xl flex-col gap-3
        sm:flex-row sm:items-center sm:justify-between
      "
    >
      <div className="flex-1 text-sm text-gray-700">{message}</div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {secondaryAction ? (
          <button
            type="button"
            className="
              rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium
              text-gray-800
            "
            onClick={secondaryAction.onPress}
          >
            {secondaryAction.label}
          </button>
        ) : null}
        {primaryAction ? (
          <button
            type="button"
            className="
              bg-primary rounded-lg px-4 py-2 text-sm font-medium text-white
            "
            onClick={primaryAction.onPress}
          >
            {primaryAction.label}
          </button>
        ) : null}
        {onDismiss ? (
          <button
            type="button"
            className="
              rounded-md px-2 py-1 text-xs font-medium text-gray-600
              hover:bg-white/70
            "
            aria-label={dismissAriaLabel}
            onClick={onDismiss}
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  </div>
);

if (import.meta.env.DEV) {
  FixedActionBanner.demo = function FixedActionBannerDemo() {
    return (
      <FixedActionBanner
        message="We use cookies to improve Eciperay."
        primaryAction={{
          label: 'Accept',
          onPress: () => {
            void 0;
          },
        }}
        secondaryAction={{
          label: 'Decline',
          onPress: () => {
            void 0;
          },
        }}
      />
    );
  };
}
