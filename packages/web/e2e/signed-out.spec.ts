import {expect, test} from '@playwright/test';

import {publicRecipeSummary} from './fixtures.js';
import {installMocks} from './mockApi.js';

test.describe('signed out', () => {
  test('an authenticated route redirects to sign-in, which renders', async ({
    page,
  }) => {
    const {pageErrors} = await installMocks(page, {signedIn: false});

    await page.goto('/recipes');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Sign In'})).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('the public Discover browse page renders recipe cards', async ({
    page,
  }) => {
    const {pageErrors} = await installMocks(page, {signedIn: false});

    await page.goto('/discover');

    await expect(page.getByText('E2E Public Pancakes')).toBeVisible();
    await expect(page.getByText(/By E2E Chef/)).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('scrolling Discover to the end loads the next page', async ({page}) => {
    const {pageErrors} = await installMocks(page, {signedIn: false});

    // 21 public recipes: one full page of 20 plus a single-recipe
    // second page. The endpoint honors offset/limit like the real
    // API; the route replaces the default mock for this path.
    const recipes = Array.from({length: 21}, (_, index) => ({
      ...publicRecipeSummary,
      id: `e2e-discover-${index}`,
      slug: `e2e-discover-${index}`,
      title: `E2E Discover Recipe ${index}`,
    }));
    await page.route('**/api/public/recipes**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname !== '/api/public/recipes') {
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

    await page.goto('/discover');
    await expect(page.getByText('E2E Discover Recipe 0')).toBeVisible();
    await expect(page.getByText('E2E Discover Recipe 20')).toHaveCount(0);

    // The design-system page loads more from its list's end-reached
    // signal: keep scrolling the list until the second page renders.
    await page.mouse.move(400, 300);
    await expect(async () => {
      await page.mouse.wheel(0, 2400);
      await expect(page.getByText('E2E Discover Recipe 20')).toBeVisible({
        timeout: 1000,
      });
    }).toPass({timeout: 30_000});
    expect(pageErrors).toEqual([]);
  });
});
