import React from 'react';
import {
  RECIPE_STATUS_FILTER_ALL,
  demoRecipeListFilters,
} from '@eciperay/client';

import {renderWithProviders} from '../../__tests__/testUtils';

import {RecipeListFiltersBar} from './RecipeListFiltersBar';

import type {TestInstance} from 'test-renderer';

// Style props that React Native's view managers type as numbers. A string
// in any of them is a hard native crash on Android: the new-architecture
// view manager throws ClassCastException (String -> Double) when the view
// mounts. The strings get there when a Tamagui skin value written as a
// bare token name ("sm", "md") fails to resolve against the app's
// number-keyed token scales and is passed through raw.
const NUMERIC_STYLE_KEYS = [
  'fontSize',
  'lineHeight',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
] as const;

const flattenStyle = (style: unknown, out: Record<string, unknown>) => {
  if (Array.isArray(style)) {
    for (const entry of style) {
      flattenStyle(entry, out);
    }
  } else if (style && typeof style === 'object') {
    for (const [key, value] of Object.entries(
      style as Record<string, unknown>,
    )) {
      out[key] = value;
    }
  }
};

const textOf = (node: TestInstance): string => {
  const parts: string[] = [];
  const walk = (current: TestInstance) => {
    for (const child of current.children ?? []) {
      if (typeof child === 'string') {
        parts.push(child);
      } else {
        walk(child);
      }
    }
  };
  walk(node);
  return parts.join(' ').slice(0, 60);
};

// Regression test for issue #150 (Android crash on Browse Recipes).
//
// Two distinct string leaks have shipped in this bar's subtree:
//  - the DS SearchField's input inherited the umbrella Input skin's
//    borderRadius "md" (fixed at the wrapper in #153, durably in
//    @spudly/ui), and
//  - the DS SelectField's value/item texts inherited the umbrella Select
//    skin's fontSize "sm" — the crash that survived #153 and kept
//    Browse Recipes crashing on 1.23.3/1.24.0 (PostHog: "Error while
//    updating property 'fontSize' of a view managed by: RCTText").
// RNTL never exercises the native view managers, so a render-level test
// cannot reproduce the ClassCastException itself; what it CAN pin — and
// what this test pins — is the exact precondition: every numeric style
// prop reaching every host view in the bar is a number, not a string.
// Against @spudly/ui 0.5.1 this fails with 14 fontSize offenders, all on
// the three selects' texts; against the fixed @spudly/ui it passes.
describe('RecipeListFiltersBar', () => {
  test('passes only numeric values for numeric style props to host views', async () => {
    const {container, findByText} = await renderWithProviders(
      <RecipeListFiltersBar
        {...demoRecipeListFilters()}
        statusFilter={RECIPE_STATUS_FILTER_ALL}
        onStatusFilterChange={() => {}}
      />,
    );

    // Sanity: the selects actually rendered their current values, so the
    // scan below is not vacuously passing over an empty tree.
    expect(await findByText('All statuses')).toBeTruthy();
    expect(await findByText('Newest')).toBeTruthy();
    expect(await findByText('High to low')).toBeTruthy();

    const offenders: string[] = [];
    for (const node of container.queryAll(() => true)) {
      const style: Record<string, unknown> = {};
      flattenStyle(node.props?.style, style);
      for (const key of NUMERIC_STYLE_KEYS) {
        if (typeof style[key] === 'string') {
          offenders.push(
            `${String(node.type)} ${key}=${JSON.stringify(
              style[key],
            )} (text: "${textOf(node)}")`,
          );
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
