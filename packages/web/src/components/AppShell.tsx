import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react';
import {eciperayTheme, tokens} from '@spudly/ui';
import {NavLink, Outlet, useNavigate, useSearchParams} from 'react-router-dom';

import {AuthenticatedPageHead} from './AuthenticatedPageHead.js';
import {Icon} from './Icon.js';
import {LegalLinks} from './LegalLinks.js';

const navItems = [
  {to: '/', end: true, label: 'Home', icon: 'home' as const},
  {to: '/recipes', label: 'Recipes', icon: 'book-open' as const},
  {to: '/meals', label: 'Meals', icon: 'coffee' as const},
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

const brandLinkStyle: CSSProperties = {display: 'flex', alignItems: 'center'};

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

const searchFormStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: tokens.spacing[2],
};

const searchInputStyle: CSSProperties = {
  border: `1px solid ${eciperayTheme.semantic.border}`,
  borderRadius: 8,
  backgroundColor: eciperayTheme.semantic.surface,
  color: eciperayTheme.semantic.text,
  fontFamily: tokens.typography.fontFamily.sans,
  fontSize: tokens.typography.fontSize.sm,
  paddingLeft: tokens.spacing[3],
  paddingRight: tokens.spacing[3],
  paddingTop: tokens.spacing[2],
  paddingBottom: tokens.spacing[2],
};

const searchButtonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 8,
  backgroundColor: eciperayTheme.semantic.primary,
  color: '#ffffff',
  cursor: 'pointer',
  fontFamily: tokens.typography.fontFamily.sans,
  fontSize: tokens.typography.fontSize.sm,
  fontWeight: tokens.typography.fontWeight.medium,
  paddingLeft: tokens.spacing[3],
  paddingRight: tokens.spacing[3],
  paddingTop: tokens.spacing[2],
  paddingBottom: tokens.spacing[2],
};

const footerStyle: CSSProperties = {
  position: 'relative',
  zIndex: 0,
  borderTop: `1px solid ${eciperayTheme.semantic.border}`,
  backgroundColor: eciperayTheme.semantic.surface,
};

const footerInnerStyle: CSSProperties = {
  maxWidth: 1024,
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: tokens.spacing[4],
  paddingRight: tokens.spacing[4],
  paddingTop: tokens.spacing[3],
  paddingBottom: tokens.spacing[3],
};

const mainStyle: CSSProperties = {
  // Positioned above the shell footer (zIndex 0): DS pages pin their
  // list error/loading bars to the bottom of the page, and at maximum
  // scroll those bars share the viewport's bottom strip with the
  // footer — the bar (inside main) must win hit-testing there, or its
  // actions (e.g. a list's Try again) become unclickable.
  position: 'relative',
  zIndex: 1,
  maxWidth: 1024,
  width: '100%',
  marginLeft: 'auto',
  marginRight: 'auto',
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  padding: tokens.spacing[4],
};

// Header search (#409): recipe search lives in the shell header and
// targets the unified Recipes browse — submitting navigates to
// /recipes with the term as the page's `q` param, which the Recipes
// host seeds its one search state from. An empty term just navigates
// to the browse.
const HeaderSearch = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q') ?? '';
  const [term, setTerm] = useState(queryParam);
  // Keep the input in sync with the URL: landing on /recipes?q=pasta
  // (a shared link, or the Recipes host seeding from the same param)
  // shows the active term here instead of an empty box that disagrees
  // with the page's filter.
  useEffect(() => {
    setTerm(queryParam);
  }, [queryParam]);
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const query = term.trim();
    void navigate(
      query ? `/recipes?q=${encodeURIComponent(query)}` : '/recipes',
    );
  };
  return (
    <form
      role="search"
      style={searchFormStyle}
      onSubmit={onSubmit}
    >
      <input
        type="search"
        aria-label="Search recipes"
        placeholder="Search recipes…"
        style={searchInputStyle}
        value={term}
        onChange={event => {
          setTerm(event.target.value);
        }}
      />
      <button
        type="submit"
        style={searchButtonStyle}
      >
        Search
      </button>
    </form>
  );
};

type AppShellProps = {children?: ReactNode};

// The header wraps (#189): at phone widths the logo and the 7-item nav
// cannot share one row, so the nav wraps below the logo instead of
// overflowing the viewport and clipping labels. Desktop widths fit on
// one row, so the wrap never engages there.
export const AppShell = ({children}: AppShellProps) => (
  <div style={shellStyle}>
    <AuthenticatedPageHead />
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
        <HeaderSearch />
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
    <footer style={footerStyle}>
      <div style={footerInnerStyle}>
        <LegalLinks variant="stacked" />
      </div>
    </footer>
  </div>
);
