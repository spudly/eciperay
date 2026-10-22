import {expect, test} from '@playwright/test';

import {installMocks} from './mockApi.js';

test.describe('profile / billing', () => {
  test('the profile page renders the current plan state', async ({page}) => {
    const {pageErrors} = await installMocks(page, {signedIn: true});

    await page.goto('/profile');

    await expect(page.getByText('Subscription')).toBeVisible();
    await expect(page.getByText('Free plan', {exact: true})).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
