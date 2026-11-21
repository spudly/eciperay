import {screen} from '@testing-library/react';
import {http, HttpResponse} from 'msw';
import {Route, Routes} from 'react-router-dom';

import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {AdminGuard} from './AdminGuard.js';

const API = 'http://localhost:8080';

const mockMe = (isAdmin: boolean) => {
  server.use(
    http.get(`${API}/api/auth/me`, () =>
      HttpResponse.json({
        id: 'user-1',
        supabaseUid: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
        isAdmin,
        createdAt: '2024-01-01T00:00:00.000Z',
      }),
    ),
  );
};

const renderGuarded = async () =>
  renderWithProviders(
    <Routes>
      <Route element={<AdminGuard />}>
        <Route
          path="/tags"
          element={<div>Tags Admin Page</div>}
        />
      </Route>
      <Route
        path="/recipes"
        element={<div>Recipes Page</div>}
      />
    </Routes>,
    {route: '/tags'},
  );

describe('AdminGuard (#621)', () => {
  test('renders the admin route for an admin', async () => {
    mockMe(true);
    await renderGuarded();
    expect(await screen.findByText('Tags Admin Page')).toBeInTheDocument();
  });

  test('redirects a non-admin to /recipes', async () => {
    mockMe(false);
    await renderGuarded();
    expect(await screen.findByText('Recipes Page')).toBeInTheDocument();
    expect(screen.queryByText('Tags Admin Page')).not.toBeInTheDocument();
  });
});
