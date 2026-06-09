import {screen} from '@testing-library/react';
import {Route, Routes} from 'react-router-dom';
import {vi} from 'vitest';

import {renderWithProviders} from '../test/testUtils.js';

import {AuthGuard} from './AuthGuard.js';

const mockUseAuth = vi.fn();

vi.mock('@recipoo/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@recipoo/client')>();
  return {...actual, useAuth: () => mockUseAuth()};
});

describe('AuthGuard', () => {
  test('shows loading state', async () => {
    mockUseAuth.mockReturnValue({session: null, isLoading: true});
    await renderWithProviders(
      <Routes>
        <Route
          element={<AuthGuard />}
          path="/"
        >
          <Route
            index
            element={<div>Protected</div>}
          />
        </Route>
      </Routes>,
      {withAuth: false},
    );
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  test('redirects when no session', async () => {
    mockUseAuth.mockReturnValue({session: null, isLoading: false});
    await renderWithProviders(
      <Routes>
        <Route
          path="/login"
          element={<div>Login</div>}
        />
        <Route
          element={<AuthGuard />}
          path="/"
        >
          <Route
            index
            element={<div>Protected</div>}
          />
        </Route>
      </Routes>,
      {withAuth: false, routerProps: {initialEntries: ['/']}},
    );
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  test('renders outlet when session exists', async () => {
    mockUseAuth.mockReturnValue({
      session: {access_token: 't'},
      isLoading: false,
    });
    await renderWithProviders(
      <Routes>
        <Route
          element={<AuthGuard />}
          path="/"
        >
          <Route
            index
            element={<div>Protected</div>}
          />
        </Route>
      </Routes>,
      {withAuth: false},
    );
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });
});
