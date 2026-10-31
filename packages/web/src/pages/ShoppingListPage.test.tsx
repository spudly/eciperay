import {queryKeys, shoppingListCheckedStorageKey} from '@eciperay/client';
import {fireEvent, screen, waitFor} from '@testing-library/react';
import {Route, Routes} from 'react-router-dom';

import {PLAN_ID} from '../test/fixtures/meal.js';
import {makeQueryClient, renderWithProviders} from '../test/testUtils.js';

import {ShoppingListPage} from './ShoppingListPage.js';

const renderPage = (queryClient?: ReturnType<typeof makeQueryClient>) =>
  renderWithProviders(
    <Routes>
      <Route
        path="/meal-plans/:planId/shopping-list"
        element={<ShoppingListPage />}
      />
    </Routes>,
    {
      route: `/meal-plans/${PLAN_ID}/shopping-list`,
      ...(queryClient ? {queryClient} : {}),
    },
  );

// The web test setup's mocked Supabase session is user-1 (see test/setup.ts).
const STORAGE_KEY = shoppingListCheckedStorageKey('user-1', PLAN_ID);

describe('ShoppingListPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });
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

  test('persists checked items across a remount (reload) (#323)', async () => {
    const first = await renderPage();
    const checkbox = await screen.findByRole('checkbox', {name: /Flour/});
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(['flour']));

    first.unmount();
    await renderPage();
    const restored = await screen.findByRole('checkbox', {name: /Flour/});
    expect(restored).toHaveAttribute('aria-checked', 'true');

    // Unchecking persists too: the stored entry is removed.
    fireEvent.click(restored);
    expect(restored).toHaveAttribute('aria-checked', 'false');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test('does not prune from a cached list (no fetch after mount)', async () => {
    // The list comes from the query cache (seeded here; test queries use
    // staleTime: Infinity, so no fetch happens after mount). A check
    // another tab stored for a newer line — one this cached list does not
    // know yet — must survive until a fresh list arrives; pruning from
    // the cached list would delete it.
    const queryClient = makeQueryClient();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['flour', 'newer']));
    queryClient.setQueryData(queryKeys.mealPlanShoppingList(PLAN_ID), [
      {
        key: 'flour',
        name: 'Flour',
        quantity: 2,
        unit: 'cups',
        isOptional: false,
        sources: [],
      },
    ]);
    await renderPage(queryClient);
    const checkbox = await screen.findByRole('checkbox', {name: /Flour/});
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    // Give any (incorrect) pruning effect a chance to run.
    await new Promise(resolve => {
      setTimeout(resolve, 50);
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe(
      JSON.stringify(['flour', 'newer']),
    );
  });

  test('a toggle does not prune checks stored by another tab', async () => {
    await renderPage();
    const checkbox = await screen.findByRole('checkbox', {name: /Flour/});
    // Another tab stores a check (for a line this tab's list does not
    // have yet) after this page loaded and fetched.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['other-tab-line']));
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    // The toggle bases its write on the latest stored set, and pruning
    // (keyed to list responses, not toggles) must not remove the other
    // tab's check against this tab's older list.
    await new Promise(resolve => {
      setTimeout(resolve, 50);
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe(
      JSON.stringify(['other-tab-line', 'flour']),
    );
  });

  test('restores stored checks and prunes lines no longer on the list', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['flour', 'gone']));
    await renderPage();
    const checkbox = await screen.findByRole('checkbox', {name: /Flour/});
    await waitFor(() => {
      expect(checkbox).toHaveAttribute('aria-checked', 'true');
    });
    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(['flour']));
    });
  });
});
