import type {CSSProperties, ReactNode} from 'react';
import {eciperayTheme, tokens} from '@spudly/ui';
import {NavLink, Outlet} from 'react-router-dom';

import {Icon} from './Icon.js';

const navItems = [
  {to: '/', end: true, label: 'Home', icon: 'home' as const},
  {to: '/recipes', label: 'Recipes', icon: 'book-open' as const},
  {to: '/meals', label: 'Meals', icon: 'coffee' as const},
  {to: '/shared-with-me', label: 'Shared with me', icon: 'users' as const},
  {to: '/add', label: 'Add', icon: 'plus' as const},
  {to: '/tags', label: 'Tags', icon: 'tag' as const},
  {to: '/profile', label: 'Profile', icon: 'user' as const},
];

// The signed-in shell (B7 C12, design-system#130): the shell's structure
// is web wiring — routing and the active-route state stay with
// react-router — while its styling is design-system tokens only (the
// Tailwind utilities it used to carry are gone with the dependency).
// Semantic elements keep the header/nav/main landmarks; the style
// objects below are the DS values the utilities resolved to.
const shellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100dvh',
};

const headerStyle: CSSProperties = {
  borderBottom: `1px solid ${eciperayTheme.semantic.border}`,
  backgroundColor: eciperayTheme.semantic.surface,
};

const headerInnerStyle: CSSProperties = {
  maxWidth: 1024,
  marginLeft: 'auto',
  marginRight: 'auto',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  columnGap: tokens.spacing[4],
  rowGap: tokens.spacing[2],
  paddingLeft: tokens.spacing[4],
  paddingRight: tokens.spacing[4],
  paddingTop: tokens.spacing[3],
  paddingBottom: tokens.spacing[3],
};

const brandLinkStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
};

const logoStyle: CSSProperties = {
  display: 'block',
  height: tokens.spacing[12],
  width: 'auto',
};

const navStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: tokens.spacing[1],
};

const navLinkStyle = ({isActive}: {isActive: boolean}): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  borderRadius: 8,
  paddingLeft: tokens.spacing[3],
  paddingRight: tokens.spacing[3],
  paddingTop: tokens.spacing[2],
  paddingBottom: tokens.spacing[2],
  fontFamily: tokens.typography.fontFamily.sans,
  fontSize: tokens.typography.fontSize.sm,
  fontWeight: tokens.typography.fontWeight.medium,
  textDecoration: 'none',
  ...(isActive
    ? {backgroundColor: eciperayTheme.semantic.primary, color: '#ffffff'}
    : {color: eciperayTheme.semantic.text}),
});

const mainStyle: CSSProperties = {
  maxWidth: 1024,
  width: '100%',
  marginLeft: 'auto',
  marginRight: 'auto',
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  padding: tokens.spacing[4],
};

type AppShellProps = {children?: ReactNode};

// The header wraps (#189): at phone widths the logo and the 7-item nav
// cannot share one row, so the nav wraps below the logo instead of
// overflowing the viewport and clipping labels. Desktop widths fit on
// one row, so the wrap never engages there.
export const AppShell = ({children}: AppShellProps) => (
  <div style={shellStyle}>
    <header style={headerStyle}>
      <div style={headerInnerStyle}>
        <NavLink
          to="/"
          style={brandLinkStyle}
        >
          <img
            src="/logo-horizontal.svg"
            alt="Eciperay"
            style={logoStyle}
          />
        </NavLink>
        <nav style={navStyle}>
          {navItems.map(({to, end, label, icon}) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={navLinkStyle}
            >
              <Icon
                name={icon}
                size={16}
              />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
    <main style={mainStyle}>{children ?? <Outlet />}</main>
  </div>
);
