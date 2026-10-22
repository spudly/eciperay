import {expect, test} from '@playwright/test';

import {installMocks} from './mockApi.js';

test.describe('meal plans', () => {
  test('the meal plans page renders the account plans', async ({page}) => {
    const {pageErrors} = await installMocks(page, {signedIn: true});

    await page.goto('/meals?tab=plans');

    await expect(page.getByText('E2E Week Plan')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
