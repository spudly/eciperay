import {expect, test} from '@playwright/test';

import {QA_SKIP_REASON, hasQaAccount, qaEmail} from './qa.js';

/**
 * Auth flows against the real backend (issue #233): the setup project has
 * already proven sign-in (it produced this session); here we cover sign-out and
 * the password-reset request. All three activate with the CI test account — see
 * qa.ts for the seam.
 */
test.skip(!hasQaAccount, QA_SKIP_REASON);

test.describe('live auth', () => {
  test('the profile page renders for the signed-in CI account', async ({
    page,
  }) => {
    await page.goto('/profile');
    await expect(
      page.getByText('Subscription', {exact: true}),
    ).toBeVisible();
  });

  test('sign out returns to a signed-out state', async ({page}) => {
    await page.goto('/profile');
    await page.getByRole('button', {name: 'Sign Out'}).click();

    // Signed-out: an authenticated route bounces to /login again.
    await page.goto('/recipes');
    await expect(page).toHaveURL(/\/login$/, {timeout: 15_000});
  });

  test('a password-reset request confirms for the CI account email', async ({
    browser,
  }) => {
    // Fresh, signed-out context (the project's storageState must not leak
    // into this flow).
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto('/forgot-password');
      await page.getByPlaceholder('Email').fill(qaEmail);
      await page.getByRole('button', {name: 'Send reset link'}).click();
      await expect(page.getByText('Email sent')).toBeVisible({timeout: 15_000});
    } finally {
      await context.close();
    }
  });
});
