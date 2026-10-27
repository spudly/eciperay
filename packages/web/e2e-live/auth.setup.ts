import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';

import {expect, test as setup} from '@playwright/test';

import {
  QA_SKIP_REASON,
  hasQaAccount,
  qaEmail,
  qaPassword,
  storageStatePath,
} from './qa.js';

/**
 * Signs in once as the dedicated CI test account and saves the session as
 * storageState for the live-auth project (issue #233: tests authenticate via a
 * storageState fixture, never hard-coded credentials).
 *
 * When the account does not exist yet (no credential secrets), this writes an
 * empty storageState and returns: the live-auth specs skip themselves with the
 * same reason, so the suite stays green and the seam is explicit.
 */
setup('authenticate as the CI test account', async ({page}) => {
  mkdirSync(path.dirname(storageStatePath), {recursive: true});

  if (!hasQaAccount) {
    writeFileSync(storageStatePath, JSON.stringify({cookies: [], origins: []}));
    console.log(`auth.setup: ${QA_SKIP_REASON}`);
    return;
  }

  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(qaEmail);
  await page.getByPlaceholder('Password').fill(qaPassword);
  await page.getByRole('button', {name: 'Sign In'}).click();

  // A successful sign-in leaves /login for the signed-in app.
  await expect(page).not.toHaveURL(/\/login$/, {timeout: 15_000});
  await page.context().storageState({path: storageStatePath});
});
