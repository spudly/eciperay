import {expect, test} from '@playwright/test';

import {
  createRecipeViaUi,
  deleteRecipeViaApi,
  type CreatedRecipe,
} from './flows.js';
import {
  QA_SKIP_REASON,
  getAccessToken,
  hasQaAccount,
  uniqueCiName,
} from './qa.js';

/**
 * Sharing-visibility basics (issue #233; default flipped by #609): a recipe
 * created manually now starts PUBLIC (public-by-default by provenance), so a
 * signed-out visitor can open its public page immediately; flipping it to
 * Private in the Sharing section takes it back out of public view. Search
 * coverage lives in recipes.spec.ts (signed-in) and public.spec.ts (Discover
 * render).
 */
test.skip(!hasQaAccount, QA_SKIP_REASON);

test.describe('live sharing', () => {
  let created: CreatedRecipe | null = null;

  test.afterEach(async ({page}) => {
    if (created) {
      await deleteRecipeViaApi(page, created.id);
      created = null;
    }
  });

  test('a public recipe is readable signed-out; a private one is not listed', async ({
    page,
    browser,
  }) => {
    created = await createRecipeViaUi(page, uniqueCiName('Sharing'), value => {
      created = value;
    });

    // The public permalink needs the recipe's slug: read it via the API.
    const token = await getAccessToken(page);
    const slug = await page.evaluate(
      async ({id, t}) => {
        const res = await fetch(`/api/recipes/${id}`, {
          headers: {Authorization: `Bearer ${t}`},
        });
        const body = (await res.json()) as {slug?: string};
        return body.slug ?? null;
      },
      {id: created.id, t: token},
    );
    expect(slug).toBeTruthy();

    // A signed-out visitor context. browser.newContext() inherits the
    // live-auth project's storageState in Playwright, so the empty state
    // is passed explicitly — without it the "visitor" would silently be
    // signed in as the QA account and prove nothing about public access.
    const context = await browser.newContext({
      storageState: {cookies: [], origins: []},
    });
    const anon = await context.newPage();
    try {
      // #609: a manually created recipe starts public, so signed-out the
      // public page renders the recipe and Discover lists it.
      await anon.goto(`/recipe/${created.id}/${slug}`);
      await expect(
        anon.getByRole('heading', {name: created.title}),
      ).toBeVisible({timeout: 15_000});
      await anon.goto('/recipes');
      await anon.getByPlaceholder('Search public recipes…').fill(created.title);
      await expect(anon.getByText(created.title).first()).toBeVisible({
        timeout: 15_000,
      });

      // Flip visibility to Private in the detail page's Sharing section.
      // Wait for the sharing PATCH to complete before the signed-out
      // assertions: without this settle anchor the anon Discover search
      // races the in-flight PATCH, reads the still-public recipe, and
      // never refetches (CI trace for 2bf4ef4d: search ran ~130ms after
      // the PATCH started; the card then stayed for the full timeout).
      await page.goto(`/recipes/${created.id}`);
      await expect(page.getByText('Sharing', {exact: true})).toBeVisible();
      await page.getByText('Private', {exact: true}).click();
      const sharingSavePromise = page.waitForResponse(response => {
        const url = new URL(response.url());
        return (
          response.request().method() === 'PATCH' &&
          url.pathname === `/api/recipes/${created.id}/sharing`
        );
      });
      await page.getByRole('button', {name: 'Save sharing settings'}).click();
      const sharingSave = await sharingSavePromise;
      expect(sharingSave.status()).toBe(200);

      // Now the recipe is not listed publicly: a Discover search for its
      // (unique) title finds nothing. The empty-search message is the
      // settle anchor — it proves the search actually ran before the
      // absence is asserted. The public page no longer renders it either.
      await anon.goto('/recipes');
      await anon.getByPlaceholder('Search public recipes…').fill(created.title);
      await expect(
        anon.getByText(
          'No public recipes match that search — try a broader craving.',
        ),
      ).toBeVisible({timeout: 15_000});
      await expect(anon.getByText(created.title)).toHaveCount(0);
      await anon.goto(`/recipe/${created.id}/${slug}`);
      await expect(anon.getByText('Recipe not found')).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await context.close();
    }
  });

  test('a private recipe opens for a guest through its share link (#534)', async ({
    page,
    browser,
  }) => {
    created = await createRecipeViaUi(
      page,
      uniqueCiName('ShareLink'),
      value => {
        created = value;
      },
    );

    // #609: the recipe starts public, and the share-link endpoint mints no
    // token for a public recipe — set it private first via the sharing API.
    const token = await getAccessToken(page);
    const patchStatus = await page.evaluate(
      async ({id, t}) => {
        const res = await fetch(`/api/recipes/${id}/sharing`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${t}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({visibility: 'private'}),
        });
        return res.status;
      },
      {id: created.id, t: token},
    );
    expect(patchStatus).toBe(200);

    // The recipe stays private. Obtain its share link the way the Share
    // action does: the share-link endpoint mints a token on first use.
    const link = await page.evaluate(
      async ({id, t}) => {
        const detailRes = await fetch(`/api/recipes/${id}`, {
          headers: {Authorization: `Bearer ${t}`},
        });
        const detail = (await detailRes.json()) as {slug?: string};
        const res = await fetch(`/api/recipes/${id}/sharing/share-link`, {
          method: 'POST',
          headers: {Authorization: `Bearer ${t}`},
        });
        const body = (await res.json()) as {shareToken?: string};
        return {slug: detail.slug ?? null, shareToken: body.shareToken ?? null};
      },
      {id: created.id, t: token},
    );
    expect(link.slug).toBeTruthy();
    expect(link.shareToken).toBeTruthy();

    const context = await browser.newContext({
      storageState: {cookies: [], origins: []},
    });
    const anon = await context.newPage();
    try {
      // Without the token the private recipe does not render for a guest.
      // Wait for the completed denial (the page's not-found state) first —
      // asserting heading absence during the loading state could pass
      // while the untokened request is still pending.
      await anon.goto(`/recipe/${created.id}/${link.slug}`);
      await expect(anon.getByText('Recipe not found')).toBeVisible({
        timeout: 15_000,
      });
      await expect(
        anon.getByRole('heading', {name: created.title}),
      ).toHaveCount(0);

      // With the token the guest sees the full recipe, plus the sign-in /
      // sign-up option the public page offers signed-out visitors.
      await anon.goto(
        `/recipe/${created.id}/${link.slug}?t=${link.shareToken}`,
      );
      await expect(
        anon.getByRole('heading', {name: created.title}),
      ).toBeVisible({timeout: 15_000});
      // The public page's signed-out CTA is a 'Sign up free' button (the
      // DS page's onSignUpPress callback navigates to /signup) — there is
      // no /signup anchor on the page; the header's Sign in link is the
      // only anchor. Assert both guest prompts.
      await expect(
        anon.getByRole('button', {name: 'Sign up free'}),
      ).toBeVisible({timeout: 15_000});
      // The header's Sign in link is the FIRST Sign in link on the
      // page: the shared footer also carries one (#619), so an
      // unscoped query is ambiguous. The old PublicHeader was a
      // banner landmark the test scoped to; the DS AppShellPage
      // top bar that replaced it (#620) renders no banner landmark
      // (the same chrome the signed-in shell has always used), so
      // document order is the header scope now.
      await expect(
        anon.getByRole('link', {name: 'Sign in'}).first(),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
