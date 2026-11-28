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

// The ONE app shell (#451; unified in #622 at Stephen's direction
// 2026-11-23): the design system owns the shell's design via
// AppShellPage (#437) — the host supplies only content and
// routing: the brand, the nav as data with each item's DS
// section KIND (never components; @spudly/ui 14.1.0, DS #880),
// the active item derived from the route, the header search as
// data (#542), and the one shared
// BigFooter data object every public surface passes (#425).
// This shell handles BOTH signed-in and signed-out users: a
// signed-out viewer gets the public nav plus a Sign in action,
// no /auth/me query runs, and no noindex authenticated head is
// applied — the public pages supply their own public head.
const navItems: AppShellPageNavItem[] = [
  {id: 'home', label: 'Home', href: '/', kind: 'home'},
  {id: 'recipes', label: 'Recipes', href: '/recipes', kind: 'recipes'},
  // The Meals item lands on the hub's Plans tab (#538): meal plans
  // are the primary surface, so the top bar goes straight there.
  {id: 'meals', label: 'Meals', href: '/meals?tab=plans', kind: 'meals'},
  {id: 'add', label: 'Add', href: '/add', kind: 'add'},
  {id: 'tags', label: 'Tags', href: '/tags', kind: 'tags'},
  {id: 'profile', label: 'Profile', href: '/profile', kind: 'profile'},
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

// The nav a signed-out viewer gets: the public destinations only
// (Home lands on the marketing page, Recipes is the public browse).
const publicNavItemIds: ReadonlySet<string> = new Set(['home', 'recipes']);

type AppShellProps = {children?: ReactNode};

// As the authenticated layout route the shell renders the router
// Outlet; HomeEntry (the `/` route, which sits outside the auth
// layout) passes its signed-in home page as children instead, and
// RecipesRoute renders the unified browse inside it for both
// signed-in and signed-out viewers.
export const AppShell = ({children}: AppShellProps) => {
  // Tag management is admin-only (#621): the Tags nav entry is only
  // offered to admins (server-computed isAdmin from /auth/me). While
  // the profile loads the entry stays hidden rather than flashing an
  // admin surface at non-admins.
  const {session} = useAuth();
  const isSignedIn = session !== null && session !== undefined;
  const {
    data: me,
    isError: meLoadFailed,
    refetch: refetchMe,
  } = useQuery({
    // Account-scoped key (#650 review): a shared QueryClient outlives
    // an account switch, so an unscoped key could render the previous
    // account's isAdmin.
    queryKey: queryKeys.currentUser(session?.user?.id ?? 'anonymous'),
    queryFn: () => eciperay.auth.me(),
    // Signed-out viewers have no account to load: never fire the
    // /auth/me query for them (#622 shell unification).
    enabled: isSignedIn,
  });
  const visibleNavItems = !isSignedIn
    ? navItems.filter(item => publicNavItemIds.has(item.id))
    : me?.isAdmin
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
      {/* The authenticated head (#414): title + noindex for every
          signed-in page. Signed-out renders skip it — their pages
          carry their own public, indexable head. */}
      {isSignedIn ? <AuthenticatedPageHead /> : null}
      <AppShellPage
        brand={{label: 'Eciperay', href: '/', mark: 'eciperay'}}
        navItems={visibleNavItems}
        // A failed /auth/me is not a non-admin verdict (#650 review):
        // the failure surfaces as a DS-rendered header action (data +
        // callback only — app code never styles its own panels,
        // Stephen 2026-11-21 / DS #119) that retries the load, while
        // Tags stays hidden and the rest of the shell keeps working.
        // A proper shell notice slot is the DS gap design-system #765.
        actions={
          !isSignedIn
            ? [{id: 'sign-in', label: 'Sign in', href: '/login'}]
            : meLoadFailed
              ? [
                  {
                    id: 'profile-load-retry',
                    label: 'Try again',
                    onPress: () => {
                      void refetchMe();
                    },
                  },
                ]
              : undefined
        }
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
