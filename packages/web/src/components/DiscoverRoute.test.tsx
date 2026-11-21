import {act, screen} from '@testing-library/react';
import {Route, Routes} from 'react-router-dom';
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

  test('redirects signed-in viewers to the unified Recipes browse', async () => {
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'u1'}},
      isLoading: false,
    });
    await renderWithProviders(
      <Routes>
        <Route
          element={<DiscoverRoute />}
          path="/discover"
        />
        <Route
          element={<div>Unified recipes</div>}
          path="/recipes"
        />
      </Routes>,
      {withAuth: false, route: '/discover'},
    );
    expect(screen.getByText('Unified recipes')).toBeInTheDocument();
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
