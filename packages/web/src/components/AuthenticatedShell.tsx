import {useEffect, useState, type ReactNode} from 'react';
import {AppShellPage, type AppShellPageNavItem} from '@spudly/ui';
import {
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {sharedFooter} from '../pages/legal/legalDocumentData.js';

// The signed-in shell (#451): the design system owns the shell's
// design via AppShellPage (#437) — the host supplies only content
// and routing: the brand, the nav as data with DS icon registry
// NAMES (never components), the active item derived from the
// route, the header search as data (#542), and the one shared
// BigFooter data object every public surface passes (#425).
const navItems: AppShellPageNavItem[] = [
  {id: 'home', label: 'Home', href: '/', icon: 'home'},
  {id: 'recipes', label: 'Recipes', href: '/recipes', icon: 'recipes'},
  {id: 'meals', label: 'Meals', href: '/meals', icon: 'meals'},
  {id: 'add', label: 'Add', href: '/add', icon: 'add'},
  {id: 'tags', label: 'Tags', href: '/tags', icon: 'tags'},
  {id: 'profile', label: 'Profile', href: '/profile', icon: 'profile'},
];

// The active nav item: exact match for Home, longest-prefix match
// otherwise — the treatment the retired host shell's NavLink
// active state gave (a recipe detail still marks Recipes current).
const activeItemIdFor = (pathname: string): string | null => {
  let best: AppShellPageNavItem | null = null;
  for (const item of navItems) {
    const matches =
      item.href === '/'
        ? pathname === '/'
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (!best || item.href.length > best.href.length)) {
      best = item;
    }
  }
  return best?.id ?? null;
};

type AuthenticatedShellProps = {children?: ReactNode};

// As the authenticated layout route the shell renders the router
// Outlet; HomeEntry (the `/` route, which sits outside the auth
// layout) passes its signed-in home page as children instead.
export const AuthenticatedShell = ({children}: AuthenticatedShellProps) => {
  const {pathname} = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q') ?? '';
  const [term, setTerm] = useState(queryParam);
  // Header search (#409, carried through the DS search slot #542):
  // the field reflects the Recipes browse's `q` param, and
  // submitting navigates to /recipes with the typed term as `q` —
  // an empty term just navigates to the browse.
  useEffect(() => {
    setTerm(queryParam);
  }, [queryParam]);

  return (
    <AppShellPage
      brand={{label: 'Eciperay', href: '/'}}
      navItems={navItems}
      navLabel="Eciperay sections"
      activeItemId={activeItemIdFor(pathname)}
      search={{
        label: 'Search recipes',
        placeholder: 'Search recipes…',
        value: term,
        onValueChange: setTerm,
        onSubmit: () => {
          const query = term.trim();
          void navigate(
            query ? `/recipes?q=${encodeURIComponent(query)}` : '/recipes',
          );
        },
      }}
      footer={sharedFooter}
    >
      {children ?? <Outlet />}
    </AppShellPage>
  );
};
