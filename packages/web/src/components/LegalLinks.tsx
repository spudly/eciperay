import type {LegalLinksProps} from '@eciperay/client';
import clsx from 'clsx';
import {Link} from 'react-router-dom';

const linkClasses = 'text-primary font-medium hover:underline';

// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
export const LegalLinks = ({
  className = '',
  variant = 'inline',
}: LegalLinksProps) => {
  if (variant === 'stacked') {
    return (
      <nav
        className={clsx('flex flex-col gap-2 text-sm', className)}
        aria-label="Legal"
      >
        <Link
          to="/privacy"
          className={linkClasses}
        >
          Privacy Policy
        </Link>
        <Link
          to="/terms"
          className={linkClasses}
        >
          Terms of Service
        </Link>
      </nav>
    );
  }

  return (
    <p className={clsx('text-muted text-center text-sm', className)}>
      By creating an account, you agree to our{' '}
      <Link
        to="/terms"
        className={linkClasses}
      >
        Terms of Service
      </Link>{' '}
      and{' '}
      <Link
        to="/privacy"
        className={linkClasses}
      >
        Privacy Policy
      </Link>
      .
    </p>
  );
};

if (import.meta.env.DEV) {
  LegalLinks.demo = function LegalLinksDemo() {
    return <LegalLinks variant="stacked" />;
  };
}
