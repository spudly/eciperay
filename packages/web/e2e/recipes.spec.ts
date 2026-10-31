import {expect, test} from '@playwright/test';

import {pastaRecipe} from './fixtures.js';
import {installMocks} from './mockApi.js';

test.describe('authenticated recipes', () => {
  test.beforeEach(async ({page}) => {
    await installMocks(page, {signedIn: true});
  });

  test('Browse renders recipe cards with no uncaught page errors', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(String(error)));

    await page.goto('/recipes');

    await expect(page.getByText('E2E Tomato Pasta')).toBeVisible();
    await expect(page.getByText('E2E Lentil Soup')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('search narrows the list', async ({page}) => {
    await page.goto('/recipes');
    await expect(page.getByText('E2E Tomato Pasta')).toBeVisible();
    await expect(page.getByText('E2E Lentil Soup')).toBeVisible();

    await page.getByPlaceholder('Search recipes…').fill('Lentil');

    // One retrying assertion over both titles: the pair must hold in
    // the SAME state. Soup alone is visible in the unfiltered list,
    // and Pasta alone disappears while the filtered query loads (the
    // list empties), so sequential assertions could pass across two
    // different states without ever seeing the filtered result.
    await expect(async () => {
      await expect(page.getByText('E2E Lentil Soup')).toBeVisible();
      await expect(page.getByText('E2E Tomato Pasta')).toHaveCount(0);
    }).toPass();
  });

  test('scrolling to the end of the list loads the next page', async ({
    page,
  }) => {
    // 21 recipes: one full page of 20 plus a single-recipe second
    // page. The list endpoint honors offset/limit like the real API.
    const recipes = Array.from({length: 21}, (_, index) => ({
      ...pastaRecipe,
      id: `e2e-page-recipe-${index}`,
      slug: `e2e-page-recipe-${index}`,
      title: `E2E Page Recipe ${index}`,
    }));
    await page.route('**/api/recipes**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname !== '/api/recipes') {
        await route.fallback();
        return;
      }
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? 20);
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(recipes.slice(offset, offset + limit)),
      });
    });

    await page.goto('/recipes');
    await expect(page.getByText('E2E Page Recipe 0')).toBeVisible();
    await expect(page.getByText('E2E Page Recipe 20')).toHaveCount(0);

    // The design-system page loads more from its list's end-reached
    // signal: keep scrolling the list until the second page renders.
    await page.mouse.move(400, 300);
    await expect(async () => {
      await page.mouse.wheel(0, 2400);
      await expect(page.getByText('E2E Page Recipe 20')).toBeVisible({
        timeout: 1000,
      });
    }).toPass({timeout: 30_000});
  });

  test('opening a recipe renders its detail', async ({page}) => {
    await page.goto('/recipes');
    await page.getByText('E2E Tomato Pasta').click();

    await expect(page).toHaveURL(/\/recipes\/e2e-recipe-pasta$/);
    await expect(
      page.getByRole('heading', {name: 'E2E Tomato Pasta'}),
    ).toBeVisible();
    // The detail page is single-scroll since B7 C7 (the design-system
    // RecipeDetailPage): ingredients and steps render on the page —
    // no tab switching. The ingredient renders as its scaled line
    // ("400 g Spaghetti"); the bare name would also match inside the
    // first instruction sentence.
    await expect(page.getByText('400 g Spaghetti')).toBeVisible();
    await expect(
      page.getByText('Boil the spaghetti in salted water'),
    ).toBeVisible();
    await expect(
      page.getByText('Simmer the tomato sauce and toss together'),
    ).toBeVisible();
  });
});
