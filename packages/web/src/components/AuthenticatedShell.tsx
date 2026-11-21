import {useEffect, useState, type ReactNode} from 'react';
import {queryKeys, useAuth} from '@eciperay/client';
import {AppShellPage, type AppShellPageNavItem} from '@spudly/ui';
import {useQuery} from '@tanstack/react-query';
import {
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {eciperay} from '../lib/api.js';
import {sharedFooter} from '../pages/legal/legalDocumentData.js';

import {AuthenticatedPageHead} from './AuthenticatedPageHead.js';

// The signed-in shell (#451): the design system owns the shell's
// design via AppShellPage (#437) — the host supplies only content
// and routing: the brand, the nav as data with DS icon registry
// NAMES (never components), the active item derived from the
// route, the header search as data (#542), and the one shared
// BigFooter data object every public surface passes (#425).
const navItems: AppShellPageNavItem[] = [
  {id: 'home', label: 'Home', href: '/', icon: 'home'},
  {id: 'recipes', label: 'Recipes', href: '/recipes', icon: 'recipes'},
  // The Meals item lands on the hub's Plans tab (#538): meal plans
  // are the primary surface, so the top bar goes straight there.
  {id: 'meals', label: 'Meals', href: '/meals?tab=plans', icon: 'meals'},
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
    // An item's href may carry a query (the Meals item lands on the
    // hub's Plans tab, #538); active matching is against the path.
    const itemPath = item.href.split('?')[0];
    const matches =
      itemPath === '/'
        ? pathname === '/'
        : pathname === itemPath || pathname.startsWith(`${itemPath}/`);
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
  // Tag management is admin-only (#621): the Tags nav entry is only
  // offered to admins (server-computed isAdmin from /auth/me). While
  // the profile loads the entry stays hidden rather than flashing an
  // admin surface at non-admins.
  const {session} = useAuth();
  const {data: me} = useQuery({
    // Account-scoped key (#650 review): a shared QueryClient outlives
    // an account switch, so an unscoped key could render the previous
    // account's isAdmin.
    queryKey: queryKeys.currentUser(session?.user?.id ?? 'anonymous'),
    queryFn: () => eciperay.auth.me(),
  });
  const visibleNavItems = me?.isAdmin
    ? navItems
    : navItems.filter(item => item.id !== 'tags');
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
    <>
      {/* The authenticated head (#414) the retired host shell
          applied: title + noindex for every signed-in page. */}
      <AuthenticatedPageHead />
      <AppShellPage
        brand={{label: 'Eciperay', href: '/'}}
        navItems={visibleNavItems}
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
    </>
  );
};
