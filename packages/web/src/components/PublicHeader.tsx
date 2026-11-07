import type {CSSProperties} from 'react';
import {eciperayTheme, tokens} from '@spudly/ui';
import {Link} from 'react-router-dom';

// The signed-out public surfaces' header band (#452): the design
// system's PublicPageFrame supplied this chrome — the brand wordmark
// home and a Sign in link at the ends of the wide public column —
// until @spudly/ui 7.0.0 retired the frame (design-system#473) and
// the DS pages took over their own footer. The header is host chrome
// now, composed here once for every public surface, with the frame's
// destinations unchanged (brand → /, Sign in → /login). Both
// controls navigate, so both are real links with hrefs. The styling
// follows the AppShell/LegalLinks precedent: style objects built
// from design-system tokens only, mirroring the retired frame's
// band (surface fill, hairline bottom border, 768px centered
// column) and its link treatments (the wordmark in primary ink,
// semibold, no underline; Sign in as a small primary link).
const bandStyle: CSSProperties = {
  borderBottom: `1px solid ${eciperayTheme.semantic.border}`,
  backgroundColor: eciperayTheme.semantic.surface,
};

const innerStyle: CSSProperties = {
  maxWidth: 768,
  marginLeft: 'auto',
  marginRight: 'auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingLeft: tokens.spacing[6],
  paddingRight: tokens.spacing[6],
  paddingTop: tokens.spacing[4],
  paddingBottom: tokens.spacing[4],
};

const brandLinkStyle: CSSProperties = {
  color: eciperayTheme.semantic.primary,
  fontFamily: tokens.typography.fontFamily.sans,
  fontSize: tokens.typography.fontSize.lg,
  fontWeight: tokens.typography.fontWeight.semibold,
  textDecoration: 'none',
};

const signInLinkStyle: CSSProperties = {
  color: eciperayTheme.semantic.primary,
  fontFamily: tokens.typography.fontFamily.sans,
  fontSize: tokens.typography.fontSize.sm,
  fontWeight: tokens.typography.fontWeight.medium,
  textDecoration: 'none',
};

export const PublicHeader = () => (
  <header style={bandStyle}>
    <div style={innerStyle}>
      <Link
        to="/"
        style={brandLinkStyle}
      >
        Eciperay
      </Link>
      <Link
        to="/login"
        style={signInLinkStyle}
      >
        Sign in
      </Link>
    </div>
  </header>
);
