import {screen} from '@testing-library/react';
import {Route, Routes} from 'react-router-dom';

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
    expect(screen.getByText('Shared with me')).toBeInTheDocument();
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
});
