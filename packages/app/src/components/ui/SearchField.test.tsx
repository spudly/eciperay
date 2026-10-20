import React from 'react';

import {renderWithProviders} from '../../__tests__/testUtils';

import {SearchField} from './SearchField';

// Regression test for issue #150 (Android crash on Browse Recipes).
//
// The DS SearchField wraps Tamagui v3's umbrella Input, whose default
// size variant sets borderRadius to the bare token name "md". The DS
// Tamagui config defines radius tokens by number (0–4), so "md" never
// resolves; on Android, Tamagui expands the string into the four
// corner-radius props and the new-architecture view manager throws
// ClassCastException (String -> Double) for borderBottomRightRadius
// when the input mounts. The app wrapper pins the input's radius to
// the numeric zero token — this test asserts every radius value that
// reaches the host TextInput is a number, the way production renders.
describe('SearchField', () => {
  test('passes only numeric radius values to the native text input', async () => {
    const {getByPlaceholderText} = await renderWithProviders(
      <SearchField
        value=""
        onChange={() => {}}
      />,
    );

    const input = getByPlaceholderText('Search recipes…');
    const style = input.props.style as Record<string, unknown>;
    const radiusKeys = Object.keys(style).filter(key => /radius/i.test(key));

    expect(radiusKeys.length).toBeGreaterThan(0);
    for (const key of radiusKeys) {
      expect(typeof style[key]).toBe('number');
    }
    expect(typeof style.borderBottomRightRadius).toBe('number');
  });
});
