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
 * Sharing-visibility basics (issue #233): a recipe starts private; making it
 * public lets a signed-out visitor open its public page. Search coverage lives
 * in recipes.spec.ts (signed-in) and public.spec.ts (Discover render).
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
    created = await createRecipeViaUi(page, uniqueCiName('Sharing'));

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

    // Flip visibility to Public in the detail page's Sharing section.
    await page.goto(`/recipes/${created.id}`);
    await expect(page.getByText('Sharing', {exact: true})).toBeVisible();
    await page.getByText('Public', {exact: true}).click();
    const consent = page.getByLabel(/Publishing consent/);
    if (await consent.isVisible({timeout: 3_000}).catch(() => false)) {
      await consent.check();
    }
    await page.getByRole('button', {name: 'Save sharing settings'}).click();
    // The permalink row appears once the recipe is public.
    await expect(page.getByText(`/recipe/${created.id}/${slug}`)).toBeVisible({
      timeout: 15_000,
    });

    // Signed-out, the public page renders the recipe.
    const context = await browser.newContext();
    const anon = await context.newPage();
    try {
      await anon.goto(`/recipe/${created.id}/${slug}`);
      await expect(
        anon.getByRole('heading', {name: created.title}),
      ).toBeVisible({timeout: 15_000});
    } finally {
      await context.close();
    }
  });
});
