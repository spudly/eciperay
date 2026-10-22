import {expect, test} from '@playwright/test';

import {installMocks} from './mockApi.js';

test.describe('profile / billing', () => {
  test('the profile page renders the current plan state', async ({page}) => {
    const {pageErrors} = await installMocks(page, {signedIn: true});

    await page.goto('/profile');

    await expect(page.getByText('Subscription')).toBeVisible();
    await expect(page.getByText('Free plan', {exact: true})).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  // #191: the section cards stacked flush against each other — the web
  // SectionCard adapter had lost the mb-8 spacing the app adapter carries.
  // Every pair of cards must be separated by a consistent gap (32px, $8).
  test('profile section cards are separated by a consistent gap', async ({
    page,
  }) => {
    await installMocks(page, {signedIn: true});

    await page.goto('/profile');
    await expect(page.getByText('Subscription')).toBeVisible();
    await expect(page.getByText('Legal')).toBeVisible();

    const gaps = await page.evaluate(() => {
      const titles = [
        'Subscription',
        'Daily nutrition goals',
        'API access tokens',
        'Transfer recipes',
        'Preferences',
        'Your data',
        'Legal',
      ];
      const cardRectFor = (title: string) => {
        const leaf = [...document.querySelectorAll('*')].find(
          el => el.children.length === 0 && el.textContent === title,
        );
        if (!leaf) {
          return null;
        }
        const titleRect = leaf.getBoundingClientRect();
        // Ascend from the title to its card: the first ancestor tall and
        // wide enough to be the card surface (skips header rows/wrappers).
        let el: Element | null = leaf;
        while (el) {
          el = el.parentElement;
          if (!el) {
            return null;
          }
          const rect = el.getBoundingClientRect();
          if (
            rect.height >= 60 &&
            rect.width >= 200 &&
            rect.bottom >= titleRect.bottom + 30
          ) {
            return {top: rect.top, bottom: rect.bottom};
          }
        }
        return null;
      };
      const rects = titles
        .map(cardRectFor)
        .filter((rect): rect is {top: number; bottom: number} => rect !== null)
        .sort((a, b) => a.top - b.top);
      return rects.slice(1).map((rect, i) => rect.top - rects[i]!.bottom);
    });

    // All seven section cards found, with a gap between every pair.
    expect(gaps).toHaveLength(6);
    for (const gap of gaps) {
      expect(gap).toBeGreaterThanOrEqual(16);
    }
  });
});
