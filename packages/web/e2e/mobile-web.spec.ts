import {expect, test} from '@playwright/test';

import {sharedRecipe} from './fixtures.js';
import {installMocks} from './mockApi.js';

/**
 * Phone-width layout regressions (#189, #190): at ~390px the header nav
 * overflowed the viewport and clipped its labels, and the recipe list cards
 * squeezed their title column to a few characters wide beside the trailing
 * action buttons.
 */
test.describe('mobile web layout (390px)', () => {
  test.beforeEach(async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await installMocks(page, {signedIn: true});
  });

  test('every nav destination is reachable and no label is clipped', async ({
    page,
  }) => {
    await page.goto('/recipes');
    await expect(page.getByText('E2E Tomato Pasta')).toBeVisible();

    const nav = page.locator('header nav');
    const labels = [
      'Home',
      'Recipes',
      'Meals',
      'Shared with me',
      'Add',
      'Tags',
      'Profile',
    ];
    for (const label of labels) {
      const link = nav.getByRole('link', {name: label});
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }

    // The page itself must not scroll sideways.
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(390);
  });

  test('recipe cards span the list width and titles get a usable column', async ({
    page,
  }) => {
    await page.goto('/recipes');
    await expect(page.getByText('E2E Tomato Pasta')).toBeVisible();

    // Width of the title's text column: ~78px before the #190 fix (titles
    // wrapped a few letters per line), several hundred after it.
    const titleColumnWidth = await page.evaluate(() => {
      const title = [...document.querySelectorAll('*')].find(
        el => el.children.length === 0 && el.textContent === 'E2E Tomato Pasta',
      );
      return title?.parentElement?.getBoundingClientRect().width ?? 0;
    });
    expect(titleColumnWidth).toBeGreaterThan(150);

    // The row's trailing control stays on the page, inside the
    // viewport. On the design-system RecipesPage the only trailing
    // control is the log-a-cook star (the list offers no Delete —
    // deleting is a detail-page action).
    const button = page
      .getByRole('button', {name: 'Log a cook of E2E Tomato Pasta'})
      .first();
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  });

  test('recipe titles stay readable at wider phone widths (430px)', async ({
    page,
  }) => {
    // The 414–430px band: the trailing actions must not rejoin the card
    // row until the title column can keep a usable width beside them.
    await page.setViewportSize({width: 430, height: 844});
    await page.goto('/recipes');
    await expect(page.getByText('E2E Tomato Pasta')).toBeVisible();

    const titleColumnWidth = await page.evaluate(() => {
      const title = [...document.querySelectorAll('*')].find(
        el => el.children.length === 0 && el.textContent === 'E2E Tomato Pasta',
      );
      return title?.parentElement?.getBoundingClientRect().width ?? 0;
    });
    expect(titleColumnWidth).toBeGreaterThan(150);

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(430);
  });

  test('shared-with-me cards span the list width', async ({page}) => {
    await page.goto('/shared-with-me');
    await expect(page.getByText('E2E Shared Salad')).toBeVisible();

    const cardBox = await page.evaluate(() => {
      const title = [...document.querySelectorAll('*')].find(
        el => el.children.length === 0 && el.textContent === 'E2E Shared Salad',
      );
      // The design-system row: the title sits in the row's link
      // text block; its parent is the card's row container, whose box
      // tracks the card itself.
      const row = title?.closest('a')?.parentElement;
      const rect = row?.getBoundingClientRect();
      return {width: rect?.width ?? 0, height: rect?.height ?? 0};
    });
    expect(cardBox.width).toBeGreaterThan(300);
    // The standalone (no trailing actions) card is a child of a column
    // layout: its height must stay content-sized (~110px), not stretch
    // to the 17rem row basis that only applies beside trailing actions.
    expect(cardBox.height).toBeLessThan(160);
  });

  test('scrolling to the end of the shared list loads the next page', async ({
    page,
  }) => {
    // 21 shared recipes: one full page of 20 plus a single-recipe
    // second page. The route honors offset/limit like the real API
    // (the shared mockApi handler serves a single recipe), mirroring
    // the recipes-list pagination case in recipes.spec.ts — the
    // shared host's onLoadMore wiring has no other positive coverage
    // (jsdom cannot drive the list's end-reached signal).
    const shared = Array.from({length: 21}, (_, index) => ({
      ...sharedRecipe,
      id: `e2e-page-shared-${index}`,
      slug: `e2e-page-shared-${index}`,
      title: `E2E Page Shared ${index}`,
    }));
    await page.route('**/api/recipes/shared-with-me**', async route => {
      const url = new URL(route.request().url());
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const limit = Number(url.searchParams.get('limit') ?? 20);
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(shared.slice(offset, offset + limit)),
      });
    });

    await page.goto('/shared-with-me');
    await expect(page.getByText('E2E Page Shared 0')).toBeVisible();
    await expect(page.getByText('E2E Page Shared 20')).toHaveCount(0);

    // The design-system page loads more from its list's end-reached
    // signal: keep scrolling the list until the second page renders.
    await page.mouse.move(195, 300);
    await expect(async () => {
      await page.mouse.wheel(0, 2400);
      await expect(page.getByText('E2E Page Shared 20')).toBeVisible({
        timeout: 1000,
      });
    }).toPass({timeout: 30_000});
  });

  test('home recently-viewed cards span the list width', async ({page}) => {
    // Viewing a recipe records it in the recently-viewed history Home
    // renders with the same RecipeListCard.
    await page.goto('/recipes/e2e-recipe-pasta');
    await expect(
      page.getByRole('heading', {name: 'E2E Tomato Pasta'}),
    ).toBeVisible();

    await page.goto('/');
    await expect(page.getByText('E2E Tomato Pasta')).toBeVisible();

    const titleColumnWidth = await page.evaluate(() => {
      const title = [...document.querySelectorAll('*')].find(
        el => el.children.length === 0 && el.textContent === 'E2E Tomato Pasta',
      );
      return title?.parentElement?.getBoundingClientRect().width ?? 0;
    });
    expect(titleColumnWidth).toBeGreaterThan(150);
  });
});
