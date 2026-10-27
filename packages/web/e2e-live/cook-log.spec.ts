import {expect, test, type Page} from '@playwright/test';

import {
  createRecipeViaUi,
  deleteRecipeViaApi,
  type CreatedRecipe,
} from './flows.js';
import {QA_SKIP_REASON, hasQaAccount, uniqueCiName} from './qa.js';

/**
 * Cook log submit + skip from cooking mode (issue #233). Cooking mode walks the
 * recipe's steps ("Next →", then "Done") and ends on the cook log form ("How
 * did it go?").
 */
test.skip(!hasQaAccount, QA_SKIP_REASON);

test.describe('live cook log', () => {
  let created: CreatedRecipe | null = null;

  test.afterEach(async ({page}) => {
    if (created) {
      await deleteRecipeViaApi(page, created.id);
      created = null;
    }
  });

  const reachCookLogForm = async (page: Page, recipeId: string) => {
    await page.goto(`/recipes/${recipeId}/cook`);
    // Wait for the loaded step text before touching anything: the cook
    // page renders its controls before the recipe query resolves, and a
    // submit fired in that window posts with an empty versionId (the
    // request goes to /versions//cooks and is lost — filed as a QA bug).
    // The step text comes from createRecipeViaUi's fixture instruction.
    await expect(page.getByText('Mix everything and cook.')).toBeVisible({
      timeout: 15_000,
    });
    // Advance through the steps: "Next →" renders disabled on the
    // last step (and clicking a disabled button hangs until the test
    // timeout), so only click it while it is enabled.
    const next = page.getByRole('button', {name: 'Next →'});
    while (await next.isEnabled().catch(() => false)) {
      await next.click();
    }
    await page.getByRole('button', {name: 'Done'}).click();
    await expect(page.getByText('How did it go?')).toBeVisible({
      timeout: 15_000,
    });
  };

  test('submitting the cook log records the cook', async ({page}) => {
    created = await createRecipeViaUi(page, uniqueCiName('Cook Log'));

    await reachCookLogForm(page, created.id);
    await page.getByRole('button', {name: '4 stars'}).click();
    await page
      .getByPlaceholder('Notes from this cook (optional)')
      .fill('CI cook log notes');
    await page.getByRole('button', {name: 'Save', exact: true}).click();

    // A successful save navigates back off the form; if the mutation
    // failed, the form (and its title) stays — fail here, not later.
    await expect(page.getByText('How did it go?')).toHaveCount(0, {
      timeout: 15_000,
    });

    // Back on the recipe, the cook shows in its history.
    await page.goto(`/recipes/${created.id}`);
    await page.getByRole('tab', {name: /history/i}).click();
    await expect(page.getByText('CI cook log notes')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('skipping the cook log records nothing', async ({page}) => {
    created = await createRecipeViaUi(page, uniqueCiName('Cook Skip'));

    await reachCookLogForm(page, created.id);
    await page.getByRole('button', {name: 'Skip', exact: true}).click();

    await expect(page.getByText('How did it go?')).toHaveCount(0, {
      timeout: 15_000,
    });

    // The form closing is not enough: Skip must not have recorded a cook
    // on the way out. The new recipe's history is empty.
    await page.goto(`/recipes/${created.id}`);
    await page.getByRole('tab', {name: /history/i}).click();
    await expect(page.getByText(/No cooks logged yet/)).toBeVisible({
      timeout: 15_000,
    });
  });
});
