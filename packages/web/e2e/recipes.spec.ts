import {expect, test} from '@playwright/test';

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

  test('opening a recipe renders its detail', async ({page}) => {
    await page.goto('/recipes');
    await page.getByText('E2E Tomato Pasta').click();

    await expect(page).toHaveURL(/\/recipes\/e2e-recipe-pasta$/);
    await expect(
      page.getByRole('heading', {name: 'E2E Tomato Pasta'}),
    ).toBeVisible();
    // Ingredients and steps live behind tabs on the detail page.
    await page.getByRole('tab', {name: 'Ingredients'}).click();
    await expect(page.getByText('Spaghetti')).toBeVisible();
    await page.getByRole('tab', {name: 'Instructions'}).click();
    await expect(
      page.getByText('Boil the spaghetti in salted water'),
    ).toBeVisible();
    await expect(
      page.getByText('Simmer the tomato sauce and toss together'),
    ).toBeVisible();
  });
});
