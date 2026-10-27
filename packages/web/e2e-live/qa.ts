import path from 'node:path';
import {fileURLToPath} from 'node:url';

import type {Page} from '@playwright/test';

/**
 * Shared helpers for the live suite (issue #233).
 *
 * The activation seam: the authenticated specs run only when the dedicated CI
 * test account's credentials are present as environment variables (E2E_QA_EMAIL
 * / E2E_QA_PASSWORD — GitHub Actions secrets in CI). Until Stephen creates that
 * account on the QA dataset and adds the secrets, every authenticated spec
 * skips with QA_SKIP_REASON instead of failing, and the signed-out/read-only
 * specs run unconditionally.
 */
export const qaEmail = process.env['E2E_QA_EMAIL'] ?? '';
export const qaPassword = process.env['E2E_QA_PASSWORD'] ?? '';
export const hasQaAccount = qaEmail !== '' && qaPassword !== '';

export const QA_SKIP_REASON =
  'E2E_QA_EMAIL/E2E_QA_PASSWORD are not set: the authenticated live specs ' +
  'activate once the dedicated CI test account exists on the QA dataset ' +
  'and its credentials are stored as CI secrets (issue #233).';

const liveDir = path.dirname(fileURLToPath(import.meta.url));

/** Where auth.setup.ts saves the signed-in session for the live-auth project. */
export const storageStatePath = path.join(liveDir, '.auth', 'qa.json');

/** Everything a live test creates is named with this prefix (hygiene rule). */
const CI_PREFIX = 'CI — ';

export const uniqueCiName = (base: string): string =>
  `${CI_PREFIX}${base} ${Math.random().toString(36).slice(2, 8)}`;

/**
 * Reads the Supabase access token out of the page's localStorage session. The
 * storage key is project-specific (`sb-<ref>-auth-token`), so it is found by
 * suffix rather than hard-coded.
 */
export const getAccessToken = async (page: Page): Promise<string | null> =>
  page.evaluate(() => {
    const key = Object.keys(window.localStorage).find(k =>
      k.endsWith('-auth-token'),
    );
    if (!key) {
      return null;
    }
    try {
      const session = JSON.parse(
        window.localStorage.getItem(key) ?? 'null',
      ) as {access_token?: string} | null;
      return session?.access_token ?? null;
    } catch {
      return null;
    }
  });

/**
 * Teardown helper: deletes a QA-dataset entity through the real API using the
 * signed-in page's session. Used in afterAll hooks so `CI —` data never
 * accumulates, even when a spec fails mid-flow. No-ops when there is no session
 * (the spec never got signed in).
 */
export const apiDelete = async (page: Page, apiPath: string): Promise<void> => {
  const token = await getAccessToken(page);
  if (!token) {
    return;
  }
  await page.evaluate(
    async ({apiPath: p, token: t}) => {
      await fetch(`/api${p}`, {
        method: 'DELETE',
        headers: {Authorization: `Bearer ${t}`},
      }).catch(() => undefined);
    },
    {apiPath, token},
  );
};
