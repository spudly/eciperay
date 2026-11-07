import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Route, Routes, useLocation} from 'react-router-dom';

import {renderWithProviders} from '../test/testUtils.js';

import {AppShell} from './AppShell.js';

describe('AppShell', () => {
  test('renders navigation and outlet', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          element={<AppShell />}
          path="/"
        >
          <Route
            index
            element={<div>Page Content</div>}
          />
        </Route>
      </Routes>,
    );
    expect(screen.getByRole('img', {name: 'Eciperay'})).toBeInTheDocument();
    expect(screen.getByText('Recipes')).toBeInTheDocument();
    // Shared-with-me has no nav item of its own: it lives on the
    // unified Recipes browse (#409).
    expect(screen.queryByText('Shared with me')).not.toBeInTheDocument();
    expect(screen.getByText('Page Content')).toBeInTheDocument();
    // The shell footer carries the legal links on every signed-in page,
    // including the Do Not Sell or Share link to the consent surface.
    expect(
      screen.getByRole('link', {
        name: 'Do Not Sell or Share My Personal Information',
      }),
    ).toHaveAttribute('href', '/privacy/consent');
  });

  test('renders children when provided instead of outlet', async () => {
    await renderWithProviders(
      <AppShell>
        <div>Inline Content</div>
      </AppShell>,
    );
    expect(screen.getByText('Inline Content')).toBeInTheDocument();
  });

  test('header search navigates to the unified Recipes browse with the term', async () => {
    const LocationProbe = () => {
      const {pathname, search} = useLocation();
      return <div>{`${pathname}${search}`}</div>;
    };
    await renderWithProviders(
      <Routes>
        <Route
          element={<AppShell />}
          path="/"
        >
          <Route
            index
            element={<div>Page Content</div>}
          />
          <Route
            path="/recipes"
            element={<LocationProbe />}
          />
        </Route>
      </Routes>,
    );
    await userEvent.type(
      screen.getByRole('searchbox', {name: 'Search recipes'}),
      'pasta',
    );
    await userEvent.click(screen.getByRole('button', {name: 'Search'}));
    expect(await screen.findByText('/recipes?q=pasta')).toBeInTheDocument();
  });

  test('header search input reflects the q param in the URL', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          element={<AppShell />}
          path="/recipes"
        >
          <Route
            index
            element={<div>Page Content</div>}
          />
        </Route>
      </Routes>,
      {route: '/recipes?q=pasta'},
    );
    expect(screen.getByRole('searchbox', {name: 'Search recipes'})).toHaveValue(
      'pasta',
    );
  });
});
