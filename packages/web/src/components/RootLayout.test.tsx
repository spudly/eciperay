import {screen} from '@testing-library/react';
import {Route, Routes} from 'react-router-dom';

import {renderWithProviders} from '../test/testUtils.js';

import {RootLayout} from './RootLayout.js';

describe('RootLayout', () => {
  test('renders route outlet inside global banners', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          element={<RootLayout />}
          path="/"
        >
          <Route
            index
            element={<div>Page Content</div>}
          />
        </Route>
      </Routes>,
    );

    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });
});
