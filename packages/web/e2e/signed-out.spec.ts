import {expect, test} from '@playwright/test';

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
});
