import type {BookLoadingSpinnerProps} from '@eciperay/client';
import clsx from 'clsx';
import type {CSSProperties} from 'react';

const BOOK_LOADER_SCALE = {sm: 0.45, md: 0.65, lg: 0.85} as const;

// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
export const BookLoadingSpinner = ({
  size = 'md',
  className,
  accessibilityLabel = 'Loading',
}: BookLoadingSpinnerProps) => (
  <span
    className={clsx('book-loader', className)}
    style={{'--book-loader-scale': BOOK_LOADER_SCALE[size]} as CSSProperties}
    role="status"
    aria-label={accessibilityLabel}
  />
);

if (import.meta.env.DEV) {
  BookLoadingSpinner.demo = function BookLoadingSpinnerDemo() {
    return (
      <div className="flex flex-col gap-6">
        <BookLoadingSpinner size="sm" />
        <BookLoadingSpinner size="md" />
        <BookLoadingSpinner size="lg" />
      </div>
    );
  };
}
