import type {LegalLinksProps} from '@eciperay/client';
import type {CSSProperties} from 'react';
import {eciperayTheme, tokens} from '@spudly/ui';
import {Link} from 'react-router-dom';

// Style objects on DS tokens (B7 C12, design-system#130 — the Tailwind
// utilities these replace are gone with the dependency).
const linkStyle: CSSProperties = {
  color: eciperayTheme.semantic.primary,
  fontWeight: tokens.typography.fontWeight.medium,
  textDecoration: 'none',
};

const stackedStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing[2],
  fontFamily: tokens.typography.fontFamily.sans,
  fontSize: tokens.typography.fontSize.sm,
};

const inlineStyle: CSSProperties = {
  color: eciperayTheme.semantic.textMuted,
  textAlign: 'center',
  fontFamily: tokens.typography.fontFamily.sans,
  fontSize: tokens.typography.fontSize.sm,
};

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
        style={stackedStyle}
        className={className || undefined}
        aria-label="Legal"
      >
        <Link
          to="/privacy"
          style={linkStyle}
        >
          Privacy Policy
        </Link>
        <Link
          to="/terms"
          style={linkStyle}
        >
          Terms of Service
        </Link>
        <Link
          to="/privacy/consent"
          style={linkStyle}
        >
          Do Not Sell or Share My Personal Information
        </Link>
      </nav>
    );
  }

  return (
    <p
      style={inlineStyle}
      className={className || undefined}
    >
      By creating an account, you agree to our{' '}
      <Link
        to="/terms"
        style={linkStyle}
      >
        Terms of Service
      </Link>{' '}
      and{' '}
      <Link
        to="/privacy"
        style={linkStyle}
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
