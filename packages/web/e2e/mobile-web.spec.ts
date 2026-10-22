import {expect, test} from '@playwright/test';

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

    // Trailing actions stay on the page, inside the viewport.
    for (const name of ['Log cook', 'Delete']) {
      const button = page.getByRole('button', {name}).first();
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
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
      let el: Element | null = title ?? null;
      // Walk up to the anchor wrapping the card.
      while (el && el.tagName !== 'A') {
        el = el.parentElement;
      }
      const rect = el?.getBoundingClientRect();
      return {width: rect?.width ?? 0, height: rect?.height ?? 0};
    });
    expect(cardBox.width).toBeGreaterThan(300);
    // The standalone (no trailing actions) card is a child of a column
    // layout: its height must stay content-sized (~110px), not stretch
    // to the 17rem row basis that only applies beside trailing actions.
    expect(cardBox.height).toBeLessThan(160);
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
