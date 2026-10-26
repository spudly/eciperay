import {MIRROR_PAIRS} from '../../../../scripts/uiParityRegistry.js';

import {
  COMPONENT_SHOWCASE_CATALOG,
  filterShowcaseEntries,
  groupShowcaseEntriesByCategory,
  type ComponentShowcaseEntry,
} from './componentShowcaseCatalog.js';

const catalogIds = (): Set<string> =>
  new Set(COMPONENT_SHOWCASE_CATALOG.map(entry => `${entry.id}.tsx`));

describe('componentShowcaseCatalog', () => {
  test('includes every mirrored component except dev showcase infrastructure', () => {
    const excluded = new Set([
      'dev/ComponentShowcaseView.tsx',
      'dev/ShowcasePicker.tsx',
      'dev/ShowcaseDemoFrame.tsx',
      'dev/ShowcaseDemo.tsx',
      'dev/showcaseModuleLoaders.ts',
    ]);
    const expected = MIRROR_PAIRS.filter(path => !excluded.has(path));
    const ids = catalogIds();

    for (const path of expected) {
      expect(ids.has(path)).toBe(true);
    }

    expect(COMPONENT_SHOWCASE_CATALOG).toHaveLength(expected.length);
  });

  test('uses unique ids', () => {
    const ids = COMPONENT_SHOWCASE_CATALOG.map(entry => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('sorts entries by category then label', () => {
    const sorted = [...COMPONENT_SHOWCASE_CATALOG].sort(
      (left: ComponentShowcaseEntry, right: ComponentShowcaseEntry) => {
        if (left.category !== right.category) {
          return left.category.localeCompare(right.category);
        }
        return left.label.localeCompare(right.label);
      },
    );

    expect(COMPONENT_SHOWCASE_CATALOG).toEqual(sorted);
  });

  test('groups entries by category', () => {
    const entries: ComponentShowcaseEntry[] = [
      {id: 'ui/A', label: 'A', category: 'UI primitives'},
      {id: 'auth/B', label: 'B', category: 'Auth'},
      {id: 'ui/C', label: 'C', category: 'UI primitives'},
    ];

    expect(groupShowcaseEntriesByCategory(entries)).toEqual({
      'UI primitives': [
        {id: 'ui/A', label: 'A', category: 'UI primitives'},
        {id: 'ui/C', label: 'C', category: 'UI primitives'},
      ],
      'Auth': [{id: 'auth/B', label: 'B', category: 'Auth'}],
    });
  });

  test('filters entries by label, id, and category', () => {
    const entries: ComponentShowcaseEntry[] = [
      {
        id: 'ui/PrimaryButton',
        label: 'PrimaryButton',
        category: 'UI primitives',
      },
      {id: 'auth/SignInView', label: 'SignInView', category: 'Auth'},
    ];

    expect(filterShowcaseEntries(entries, '')).toEqual(entries);
    expect(filterShowcaseEntries(entries, '  primary  ')).toEqual([entries[0]]);
    expect(filterShowcaseEntries(entries, 'auth')).toEqual([entries[1]]);
  });

  test('assigns categories for root-level and prefixed showcase paths', () => {
    const icon = COMPONENT_SHOWCASE_CATALOG.find(entry => entry.id === 'Icon');
    const recipeCard = COMPONENT_SHOWCASE_CATALOG.find(
      entry => entry.id === 'RecipeListCard',
    );
    const primary = COMPONENT_SHOWCASE_CATALOG.find(
      entry => entry.id === 'ui/CheckboxField',
    );

    expect(icon).toMatchObject({label: 'Icon', category: 'Shared'});
    expect(recipeCard).toMatchObject({
      label: 'RecipeListCard',
      category: 'Shared',
    });
    expect(primary).toMatchObject({
      label: 'CheckboxField',
      category: 'UI primitives',
    });
  });
});
