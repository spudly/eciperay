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

/**
 * A second, dedicated session that only sign-out.spec.ts consumes: signing out
 * must never touch the shared session above (Supabase signOut defaults to
 * global scope and revokes every session for the user).
 */
export const signOutStatePath = path.join(liveDir, '.auth', 'qa-signout.json');

/**
 * Text import parses server-side with Anthropic, so the imports spec also needs
 * the API key in the job environment. The e2e-live CI job passes
 * ANTHROPIC_API_KEY through from secrets; while no secret exists the spec skips
 * with AI_SKIP_REASON instead of failing on the server's 500.
 */
export const hasAiKey = (process.env['ANTHROPIC_API_KEY'] ?? '') !== '';

export const AI_SKIP_REASON =
  'ANTHROPIC_API_KEY is not set: text import parses with Anthropic ' +
  'server-side, so the imports spec activates once the key is provided ' +
  'as a CI secret (issue #233).';

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
 * accumulates, even when a spec fails mid-flow. A failed DELETE throws: cleanup
 * that did not happen must fail the run loudly instead of silently leaking `CI
 * —` records into the persistent QA dataset. The one exception is 404 — the
 * entity is already gone (e.g. the spec deleted it through the UI and this is
 * the belt-and-braces API pass), which is the teardown goal already met. A
 * missing access token throws too: callers only invoke this for records they
 * created under a session, so a session that has since expired or been cleared
 * must not silently skip the delete.
 */
export const apiDelete = async (page: Page, apiPath: string): Promise<void> => {
  const token = await getAccessToken(page);
  if (!token) {
    throw new Error(
      `apiDelete: no access token for DELETE ${apiPath}; ` +
        'the CI record may still exist in the QA dataset.',
    );
  }
  const status = await page.evaluate(
    async ({apiPath: p, token: t}) => {
      const response = await fetch(`/api${p}`, {
        method: 'DELETE',
        headers: {Authorization: `Bearer ${t}`},
      });
      return response.status;
    },
    {apiPath, token},
  );
  if (status !== 404 && (status < 200 || status >= 300)) {
    throw new Error(
      `apiDelete: DELETE ${apiPath} failed with status ${status}; ` +
        'the CI record may still exist in the QA dataset.',
    );
  }
};
