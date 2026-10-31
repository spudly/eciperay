import {fireEvent, screen, waitFor} from '@testing-library/react';
import {Route, Routes} from 'react-router-dom';

import {PLAN_ID} from '../test/fixtures/meal.js';
import {renderWithProviders} from '../test/testUtils.js';

import {ShoppingListPage} from './ShoppingListPage.js';

describe('ShoppingListPage', () => {
  test('renders shopping list', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/meal-plans/:planId/shopping-list"
          element={<ShoppingListPage />}
        />
      </Routes>,
      {route: `/meal-plans/${PLAN_ID}/shopping-list`},
    );
    await waitFor(() => {
      expect(screen.getByText('Flour')).toBeInTheDocument();
    });
    expect(screen.getByText('Shopping list')).toBeInTheDocument();
  });

  test('toggles checked items', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/meal-plans/:planId/shopping-list"
          element={<ShoppingListPage />}
        />
      </Routes>,
      {route: `/meal-plans/${PLAN_ID}/shopping-list`},
    );
    const row = await screen.findByText('Flour');
    fireEvent.click(row);
    fireEvent.click(row);
    expect(row).toBeInTheDocument();
    // The DS page's row itself carries the checkbox semantics (the
    // contract the live Playwright spec locates by): role + accessible
    // name + aria-checked state on the row element.
    const checkbox = screen.getByRole('checkbox', {name: /Flour/});
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });
});
