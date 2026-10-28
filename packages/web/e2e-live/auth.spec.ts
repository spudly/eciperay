import {expect, test} from '@playwright/test';

import {QA_SKIP_REASON, hasQaAccount, qaEmail} from './qa.js';

/**
 * Auth flows against the real backend (issue #233): the setup project has
 * already proven sign-in (it produced this session); here we cover the
 * signed-in profile and the password-reset request. Sign-out lives in
 * sign-out.spec.ts, isolated from this shared session. All specs activate with
 * the CI test account — see qa.ts for the seam.
 */
test.skip(!hasQaAccount, QA_SKIP_REASON);

test.describe('live auth', () => {
  test('the profile page renders for the signed-in CI account', async ({
    page,
  }) => {
    await page.goto('/profile');
    await expect(page.getByText('Subscription', {exact: true})).toBeVisible();
  });

  test('a password-reset request confirms for the CI account email', async ({
    browser,
  }) => {
    // Fresh, signed-out context. browser.newContext() inherits the
    // project's storageState in Playwright, so the empty state is
    // passed explicitly to keep the shared session out of this flow.
    const context = await browser.newContext({
      storageState: {cookies: [], origins: []},
    });
    const page = await context.newPage();
    try {
      await page.goto('/forgot-password');
      await page.getByLabel('Email').fill(qaEmail);
      await page.getByRole('button', {name: 'Send Reset Link'}).click();
      await expect(page.getByText('Email sent')).toBeVisible({timeout: 15_000});
    } finally {
      await context.close();
    }
  });
});
