import {screen} from '@testing-library/react';
import {Route, Routes} from 'react-router-dom';

import {renderWithProviders} from '../test/testUtils.js';

import {AppShell} from './AppShell.js';

describe('AppShell', () => {
  test('renders navigation and outlet', () => {
    renderWithProviders(
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
    expect(screen.getByText('Recipoo')).toBeInTheDocument();
    expect(screen.getByText('Recipes')).toBeInTheDocument();
    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });
});
