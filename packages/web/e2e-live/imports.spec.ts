import {expect, test} from '@playwright/test';

import {deleteRecipeViaApi} from './flows.js';
import {
  AI_SKIP_REASON,
  QA_SKIP_REASON,
  hasAiKey,
  hasQaAccount,
  uniqueCiName,
} from './qa.js';

/**
 * Text import end-to-end (issue #233). URL/image imports stay out of the live
 * suite: URL import depends on third-party page content and image import on AI
 * generation, neither of which is a stable CI target.
 *
 * Text import itself parses with Anthropic server-side, so on top of the CI
 * test account this spec needs ANTHROPIC_API_KEY in the job environment —
 * without it the endpoint 500s and the spec skips with AI_SKIP_REASON.
 */
test.skip(!hasQaAccount, QA_SKIP_REASON);
test.skip(!hasAiKey, AI_SKIP_REASON);

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

    await page.goto('/add/text');
    const editor = page.locator('[data-placeholder]');
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
    await page.getByRole('button', {name: 'Import', exact: true}).click();

    // The review screen shows the parsed recipe; accepting it saves.
    // The parser normalizes the title (it dropped this spec's "CI —"
    // prefix and random suffix, returning "Imported Soup"), so assert
    // on the parsed content it does carry verbatim — the ingredients —
    // not on the exact title it was fed.
    await expect(page).toHaveURL(/\/import\/review\//, {timeout: 30_000});
    await expect(page.getByText('2 cups water')).toBeVisible();
    await page.getByRole('button', {name: 'Looks good'}).click();

    await expect(page).toHaveURL(/\/recipes\/[^/]+$/, {timeout: 15_000});
    // Capture the id before any further assertion: teardown deletes by
    // id, and a failed assertion after this point must not leak the
    // imported recipe into the QA dataset.
    createdId = page.url().split('/recipes/')[1]!;
    await expect(
      page.getByRole('heading', {name: 'Imported Soup'}),
    ).toBeVisible();
  });
});
