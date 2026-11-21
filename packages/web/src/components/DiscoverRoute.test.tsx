import {act, screen} from '@testing-library/react';
import {Route, Routes, useLocation} from 'react-router-dom';
import {afterEach, beforeEach, vi} from 'vitest';

import {renderWithProviders} from '../test/testUtils.js';

import {DiscoverRoute} from './DiscoverRoute.js';

const mockUseAuth = vi.fn();

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {...actual, useAuth: () => mockUseAuth()};
});

vi.mock('../pages/DiscoverPage.js', () => ({
  DiscoverPage: () => <div>Public discover</div>,
}));

vi.mock('../pages/RecipesPage.js', () => ({
  RecipesPage: () => <div>Unified recipes</div>,
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div>{`path:${location.pathname}`}</div>;
};

vi.mock('./AuthenticatedShell.js', () => ({
  AuthenticatedShell: ({children}: {children?: import('react').ReactNode}) => (
    <div>
      <div>Authenticated shell</div>
      {children}
    </div>
  ),
}));

describe('DiscoverRoute (#622 unified browse)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('shows loading state while auth resolves', async () => {
    mockUseAuth.mockReturnValue({session: null, isLoading: true});
    await renderWithProviders(
      <Routes>
        <Route
          element={<DiscoverRoute />}
          path="/discover"
        />
      </Routes>,
      {withAuth: false, route: '/discover'},
    );
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('renders the unified Recipes browse in place at /discover for signed-in viewers (no redirect)', async () => {
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'u1'}},
      isLoading: false,
    });
    // No /recipes route is registered: if DiscoverRoute redirected
    // there (the pre-rework behavior Stephen rejected 2026-11-21),
    // nothing would render. The unified browse must appear at the
    // /discover URL itself, inside the authenticated shell.
    await renderWithProviders(
      <>
        <LocationProbe />
        <Routes>
          <Route
            element={<DiscoverRoute />}
            path="/discover"
          />
        </Routes>
      </>,
      {withAuth: false, route: '/discover'},
    );
    expect(screen.getByText('Unified recipes')).toBeInTheDocument();
    expect(screen.getByText('Authenticated shell')).toBeInTheDocument();
    expect(screen.queryByText('Public discover')).not.toBeInTheDocument();
    expect(screen.getByText('path:/discover')).toBeInTheDocument();
  });

  test('renders the public Discover treatment for signed-out viewers', async () => {
    mockUseAuth.mockReturnValue({session: null, isLoading: false});
    await renderWithProviders(
      <Routes>
        <Route
          element={<DiscoverRoute />}
          path="/discover"
        />
      </Routes>,
      {withAuth: false, route: '/discover'},
    );
    expect(screen.getByText('Public discover')).toBeInTheDocument();
  });
});
