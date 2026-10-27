import {expect, test} from '@playwright/test';

import {QA_SKIP_REASON, hasQaAccount, qaEmail, qaPassword} from './qa.js';

/**
 * Sign-out against the real backend (issue #233), isolated from the shared
 * session in two deliberate ways:
 *
 * - It signs in with its OWN context, never the project's storageState. The app's
 *   Sign Out calls Supabase signOut with the default global scope, which
 *   revokes every session for the user — including the setup session every
 *   other live-auth spec reuses. When this test ran on the shared page (it
 *   originally lived in auth.spec.ts), every spec after it failed signed-out:
 *   forms rendered, then the session rejection bounced the page to /login
 *   mid-flow.
 * - The filename sorts after every other live-auth spec (the project runs
 *   workers: 1 in file order), so even the global revocation lands when nothing
 *   else still needs a session.
 */
test.skip(!hasQaAccount, QA_SKIP_REASON);

test('sign out returns to a signed-out state', async ({browser}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('/login');
    await page.getByPlaceholder('Email').fill(qaEmail);
    await page.getByPlaceholder('Password').fill(qaPassword);
    await page.getByRole('button', {name: 'Sign In'}).click();
    await expect(page).not.toHaveURL(/\/login$/, {timeout: 15_000});

    await page.goto('/profile');
    await page.getByRole('button', {name: 'Sign Out'}).click();

    // Signed-out: an authenticated route bounces to /login again.
    await page.goto('/recipes');
    await expect(page).toHaveURL(/\/login$/, {timeout: 15_000});
  } finally {
    await context.close();
  }
});
