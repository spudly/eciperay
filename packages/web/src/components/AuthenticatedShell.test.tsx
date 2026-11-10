import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Route, Routes, useLocation} from 'react-router-dom';

import {renderWithProviders} from '../test/testUtils.js';

import {AuthenticatedShell} from './AuthenticatedShell.js';

describe('AuthenticatedShell', () => {
  test('renders the DS shell nav and outlet', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          element={<AuthenticatedShell />}
          path="/"
        >
          <Route
            index
            element={<div>Page Content</div>}
          />
        </Route>
      </Routes>,
    );
    // The brand wordmark is a real link home (the DS BrandLink) —
    // and the BigFooter's brand anchor is the second such link.
    const brandLinks = screen.getAllByRole('link', {name: 'Eciperay'});
    expect(brandLinks).toHaveLength(2);
    for (const brandLink of brandLinks) {
      expect(brandLink).toHaveAttribute('href', '/');
    }
    // Nav items cross as data with DS icon names; every item is a
    // real link with its href.
    expect(screen.getByRole('link', {name: 'Recipes'})).toHaveAttribute(
      'href',
      '/recipes',
    );
    expect(screen.getByRole('link', {name: 'Meals'})).toHaveAttribute(
      'href',
      '/meals',
    );
    expect(screen.getByRole('link', {name: 'Profile'})).toHaveAttribute(
      'href',
      '/profile',
    );
    // Shared-with-me has no nav item of its own: it lives on the
    // unified Recipes browse (#409).
    expect(screen.queryByText('Shared with me')).not.toBeInTheDocument();
    expect(screen.getByText('Page Content')).toBeInTheDocument();
    // The shell footer is the one shared BigFooter, carrying the
    // Do Not Sell or Share link to the consent surface (#425).
    expect(
      screen.getByRole('link', {
        name: 'Do Not Sell or Share My Personal Information',
      }),
    ).toHaveAttribute('href', '/privacy/consent');
  });

  test('header search navigates to the unified Recipes browse with the term', async () => {
    const LocationProbe = () => {
      const {pathname, search} = useLocation();
      return <div>{`${pathname}${search}`}</div>;
    };
    await renderWithProviders(
      <Routes>
        <Route
          element={<AuthenticatedShell />}
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
    // The DS SearchField submits on Enter (its onSubmitEditing
    // contract) — there is no separate Search button in the shell.
    await userEvent.type(
      screen.getByPlaceholderText('Search recipes…'),
      'pasta{enter}',
    );
    expect(await screen.findByText('/recipes?q=pasta')).toBeInTheDocument();
  });

  test('header search input reflects the q param in the URL', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          element={<AuthenticatedShell />}
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
    expect(screen.getByPlaceholderText('Search recipes…')).toHaveValue('pasta');
  });
});
