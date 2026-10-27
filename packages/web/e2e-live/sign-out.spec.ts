import {expect, test} from '@playwright/test';

import {QA_SKIP_REASON, hasQaAccount, signOutStatePath} from './qa.js';

/**
 * Sign-out against the real backend (issue #233), isolated from the shared
 * session in two deliberate ways:
 *
 * - It consumes the DEDICATED session auth.setup.ts saves for it
 *   (signOutStatePath), never the shared storageState the other live-auth specs
 *   reuse. The app's Sign Out calls Supabase signOut with the default global
 *   scope, which revokes every session for the user — when this test ran on the
 *   shared session (it originally lived in auth.spec.ts), every spec after it
 *   failed signed-out.
 * - The filename sorts after every other live-auth spec (the project runs
 *   workers: 1 in file order), so even the global revocation lands when nothing
 *   else still needs a session.
 */
test.use({storageState: signOutStatePath});
test.skip(!hasQaAccount, QA_SKIP_REASON);

test('sign out returns to a signed-out state', async ({page}) => {
  await page.goto('/profile');
  await page.getByRole('button', {name: 'Sign Out'}).click();

  // Signed-out: an authenticated route bounces to /login again.
  await page.goto('/recipes');
  await expect(page).toHaveURL(/\/login$/, {timeout: 15_000});
});
