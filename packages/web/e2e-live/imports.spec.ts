import {expect, test} from '@playwright/test';

import {deleteRecipeViaApi, deleteRecipesByTitleViaApi} from './flows.js';
import {
  AI_SKIP_REASON,
  QA_SKIP_REASON,
  hasAi,
  hasQaAccount,
  uniqueCiName,
} from './qa.js';

/**
 * Text import end-to-end (issue #233). URL/image imports stay out of the live
 * suite: URL import depends on third-party page content and image import on AI
 * generation, neither of which is a stable CI target.
 *
 * Text import itself parses with Anthropic server-side, so on top of the CI
 * test account this spec needs a working AI transport in the job environment.
 * CI sets ECIPERAY_AI_FAKE=1: the in-job server answers AI calls from the
 * canned fake transport, so the suite consumes no real Anthropic API credits
 * and the parse deterministically returns the "Imported Soup" recipe asserted
 * below (issue #336). A real ANTHROPIC_API_KEY also works (local runs); with
 * neither, the endpoint 500s and the spec skips with AI_SKIP_REASON.
 */
test.skip(!hasQaAccount, QA_SKIP_REASON);
test.skip(!hasAi, AI_SKIP_REASON);

test.describe('live imports', () => {
  let createdId: string | null = null;

  test.afterEach(async ({page}) => {
    if (createdId) {
      await deleteRecipeViaApi(page, createdId);
      createdId = null;
    }
  });

  test('pasting recipe text imports a recipe', async ({page}) => {
    const title = uniqueCiName('Imported Soup');

    // Self-healing pre-clean (issue #492): the canned parse always yields
    // the title "Imported Soup" with the same two ingredients, which is
    // exactly the duplicate fingerprint (title + ingredients, issue #296).
    // A copy leaked by an earlier run — imported, then neither renamed by
    // this spec's last step nor deleted by its teardown because a step in
    // between failed — makes this import return the 409 duplicate warning
    // instead of a 201, and the waitForResponse below times out even
    // though the server answered in ~0.5s (diagnosed from the Playwright
    // trace of run 42953528221: POST /api/recipes/import/text → 409
    // duplicate_recipe naming the leaked copy). Remove any exact-title
    // copies first so the import below always starts from a clean library.
    await page.goto('/recipes');
    await deleteRecipesByTitleViaApi(page, 'Imported Soup', ['water', 'salt']);

    await page.goto('/add/text');
    // The design system ImportTextPage renders a plain text field (the
    // retired web view's rich-text editor carried a data-placeholder div).
    const editor = page.getByPlaceholder('Paste your recipe here…');
    await editor.click();
    await page.keyboard.type(
      [
        title,
        '',
        'Ingredients',
        '2 cups water',
        '1 tsp salt',
        '',
        'Instructions',
        'Boil the water, add the salt, and serve.',
      ].join('\n'),
    );
    // Capture the created recipe's ID from the import response itself,
    // before navigation is asserted: the recipe already exists server-side
    // once the POST returns 201 (ImportTextPage receives the same ID
    // before it navigates), and teardown deletes by ID — if navigation to
    // the review screen then fails, afterEach must still be able to
    // remove it instead of leaking it into the QA dataset.
    const importResponsePromise = page.waitForResponse(response => {
      const url = new URL(response.url());
      return (
        response.request().method() === 'POST' &&
        response.status() === 201 &&
        url.pathname === '/api/recipes/import/text'
      );
    });
    await page.getByRole('button', {name: 'Import', exact: true}).click();
    const importResponse = await importResponsePromise;
    createdId = ((await importResponse.json()) as {recipeId: string}).recipeId;

    // The review screen shows the parsed recipe; accepting it saves.
    // The parser normalizes the title (it dropped this spec's "CI —"
    // prefix and random suffix, returning "Imported Soup"), so assert
    // on the parsed content it does carry verbatim — the ingredients —
    // not on the exact title it was fed.
    await expect(page).toHaveURL(/\/import\/review\/[^/]+$/, {timeout: 30_000});
    await expect(page.getByText('2 cups water')).toBeVisible();
    await page.getByRole('button', {name: 'Looks good'}).click();

    await expect(page).toHaveURL(/\/recipes\/[^/]+$/, {timeout: 15_000});
    await expect(
      page.getByRole('heading', {name: 'Imported Soup'}),
    ).toBeVisible();

    // The saved recipe carries the parser's unprefixed title; rename it
    // to this spec's `CI —` title through the standard edit flow (the
    // same one recipes.spec.ts proves) so everything the suite leaves
    // behind — even briefly — follows the prefix hygiene rule.
    await page.goto(`/recipes/${createdId}/edit`);
    await page.getByLabel('Title').fill(title);
    await page.getByRole('button', {name: 'Save Changes'}).click();
    await expect(page.getByRole('heading', {name: title})).toBeVisible({
      timeout: 15_000,
    });
  });
});
