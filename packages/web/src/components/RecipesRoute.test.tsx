import {act, screen} from '@testing-library/react';
import {Route, Routes, useLocation} from 'react-router-dom';
import {afterEach, beforeEach, vi} from 'vitest';

import {renderWithProviders} from '../test/testUtils.js';

import {RecipesRoute} from './RecipesRoute.js';

const mockUseAuth = vi.fn();

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {...actual, useAuth: () => mockUseAuth()};
});

vi.mock('../pages/RecipesPage.js', () => ({
  RecipesPage: () => <div>Unified recipes</div>,
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div>{`path:${location.pathname}`}</div>;
};

vi.mock('./AppShell.js', () => ({
  AppShell: ({children}: {children?: import('react').ReactNode}) => (
    <div>
      <div>App shell</div>
      {children}
    </div>
  ),
}));

describe('RecipesRoute (#622 unified browse)', () => {
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
          element={<RecipesRoute />}
          path="/recipes"
        />
      </Routes>,
      {withAuth: false, route: '/recipes'},
    );
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('renders the one Recipes page in the one shell at /recipes for signed-in viewers (no redirect)', async () => {
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'u1'}},
      isLoading: false,
    });
    await renderWithProviders(
      <>
        <LocationProbe />
        <Routes>
          <Route
            element={<RecipesRoute />}
            path="/recipes"
          />
        </Routes>
      </>,
      {withAuth: false, route: '/recipes'},
    );
    expect(screen.getByText('Unified recipes')).toBeInTheDocument();
    expect(screen.getByText('App shell')).toBeInTheDocument();
    expect(screen.getByText('path:/recipes')).toBeInTheDocument();
  });

  test('renders the same page in the same shell for signed-out viewers', async () => {
    mockUseAuth.mockReturnValue({session: null, isLoading: false});
    await renderWithProviders(
      <Routes>
        <Route
          element={<RecipesRoute />}
          path="/recipes"
        />
      </Routes>,
      {withAuth: false, route: '/recipes'},
    );
    expect(screen.getByText('Unified recipes')).toBeInTheDocument();
    expect(screen.getByText('App shell')).toBeInTheDocument();
  });
});
