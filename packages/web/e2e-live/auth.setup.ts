import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';

import {expect, test as setup, type Page} from '@playwright/test';

import {
  QA_SKIP_REASON,
  hasQaAccount,
  qaEmail,
  qaPassword,
  signOutStatePath,
  storageStatePath,
} from './qa.js';

/**
 * Signs in as the dedicated CI test account and saves the session as
 * storageState for the live-auth project (issue #233: tests authenticate via a
 * storageState fixture, never hard-coded credentials). A second sign-in in a
 * fresh context produces the dedicated session sign-out.spec.ts consumes, so
 * signing out there can never revoke the shared session.
 *
 * When the account does not exist yet (no credential secrets), this writes
 * empty storageStates and returns: the live-auth specs skip themselves with the
 * same reason, so the suite stays green and the seam is explicit.
 */
const signIn = async (page: Page): Promise<void> => {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(qaEmail);
  await page.getByPlaceholder('Password').fill(qaPassword);
  await page.getByRole('button', {name: 'Sign In'}).click();

  // A successful sign-in leaves /login for the signed-in app.
  await expect(page).not.toHaveURL(/\/login$/, {timeout: 15_000});
};

setup('authenticate as the CI test account', async ({page}) => {
  mkdirSync(path.dirname(storageStatePath), {recursive: true});

  if (!hasQaAccount) {
    const empty = JSON.stringify({cookies: [], origins: []});
    writeFileSync(storageStatePath, empty);
    writeFileSync(signOutStatePath, empty);
    console.log(`auth.setup: ${QA_SKIP_REASON}`);
    return;
  }

  await signIn(page);
  await page.context().storageState({path: storageStatePath});

  const signOutContext = await page.context().browser()!.newContext();
  try {
    await signIn(await signOutContext.newPage());
    await signOutContext.storageState({path: signOutStatePath});
  } finally {
    await signOutContext.close();
  }
});
