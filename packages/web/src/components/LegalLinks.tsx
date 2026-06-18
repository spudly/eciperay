import {Link} from 'react-router-dom';

type LegalLinksProps = {className?: string; variant?: 'inline' | 'stacked'};

export const LegalLinks = ({
  className = '',
  variant = 'inline',
}: LegalLinksProps) => {
  const linkClass = 'text-primary font-medium hover:underline';

  if (variant === 'stacked') {
    return (
      <nav
        className={`
          flex flex-col gap-2 text-sm
          ${className}
        `}
        aria-label="Legal"
      >
        <Link
          to="/privacy"
          className={linkClass}
        >
          Privacy Policy
        </Link>
        <Link
          to="/terms"
          className={linkClass}
        >
          Terms of Service
        </Link>
      </nav>
    );
  }

  return (
    <p
      className={`
        text-muted text-center text-sm
        ${className}
      `}
    >
      By creating an account, you agree to our{' '}
      <Link
        to="/terms"
        className={linkClass}
      >
        Terms of Service
      </Link>{' '}
      and{' '}
      <Link
        to="/privacy"
        className={linkClass}
      >
        Privacy Policy
      </Link>
      .
    </p>
  );
};
