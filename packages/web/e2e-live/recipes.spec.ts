import {expect, test} from '@playwright/test';

import {
  createRecipeViaUi,
  deleteRecipeViaApi,
  deleteRecipeViaUi,
  openRecipeFromList,
  type CreatedRecipe,
} from './flows.js';
import {QA_SKIP_REASON, hasQaAccount, uniqueCiName} from './qa.js';

/**
 * Recipe CRUD + servings/scale against the real backend (issue #233). Every
 * recipe is `CI —`-prefixed and removed in teardown (API delete as the reliable
 * path; the delete test itself exercises the UI flow).
 */
test.skip(!hasQaAccount, QA_SKIP_REASON);

test.describe('live recipes', () => {
  let created: CreatedRecipe | null = null;

  test.afterEach(async ({page}) => {
    if (created) {
      await deleteRecipeViaApi(page, created.id);
      created = null;
    }
  });

  test('create renders on the detail page and is findable by search', async ({
    page,
  }) => {
    created = await createRecipeViaUi(page, uniqueCiName('Pasta'));

    await page.getByRole('tab', {name: 'Ingredients'}).click();
    await expect(page.getByText('CI Test Ingredient')).toBeVisible();

    await openRecipeFromList(page, created.title);
  });

  test('edit renames the recipe', async ({page}) => {
    created = await createRecipeViaUi(page, uniqueCiName('Rename Me'));
    const renamed = `${created.title} Edited`;

    await page.goto(`/recipes/${created.id}/edit`);
    await page.getByLabel('Title').fill(renamed);
    await page.getByRole('button', {name: 'Save recipe'}).click();

    await expect(page.getByRole('heading', {name: renamed})).toBeVisible({
      timeout: 15_000,
    });
    created = {...created, title: renamed};
  });

  test('the scale control doubles ingredient quantities', async ({page}) => {
    created = await createRecipeViaUi(page, uniqueCiName('Scaling'));

    await page.getByRole('tab', {name: 'Ingredients'}).click();
    await expect(page.getByText(/400\s*g/)).toBeVisible();

    await page.getByText('2×', {exact: true}).click();
    await expect(page.getByText(/800\s*g/)).toBeVisible({timeout: 15_000});
  });

  test('delete removes the recipe from the list', async ({page}) => {
    created = await createRecipeViaUi(page, uniqueCiName('Delete Me'));
    const {title} = created;
    created = null; // the UI flow below is the deletion; nothing to clean up

    await deleteRecipeViaUi(page, title);
  });
});
