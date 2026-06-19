import {
  ingredientsOrInstructionsChanged,
  preserveTweakDescription,
} from './preserveTweakDescription.js';

describe('preserveTweakDescription', () => {
  test('keeps parent description when ingredients are unchanged', () => {
    expect(
      preserveTweakDescription(
        'A classic cake',
        'Changed to be sweeter',
        false,
      ),
    ).toBe('A classic cake');
  });

  test('rejects changelog-style descriptions', () => {
    expect(
      preserveTweakDescription(
        'A classic cake',
        'Updated from previous version to be sweeter',
        true,
      ),
    ).toBe('A classic cake');
  });

  test('accepts standalone descriptions when content changed', () => {
    expect(
      preserveTweakDescription(
        'A classic cake',
        'A lighter sponge cake with citrus notes',
        true,
      ),
    ).toBe('A lighter sponge cake with citrus notes');
  });

  test('keeps parent description when proposed description is empty', () => {
    expect(preserveTweakDescription('A classic cake', '', true)).toBe(
      'A classic cake',
    );
    expect(preserveTweakDescription('A classic cake', '   ', true)).toBe(
      'A classic cake',
    );
  });

  test('returns null parent when content is unchanged', () => {
    expect(preserveTweakDescription(null, 'ignored', false)).toBe(null);
  });

  test('returns parent when proposed description is null', () => {
    expect(preserveTweakDescription('parent desc', null, true)).toBe(
      'parent desc',
    );
  });
});

describe('ingredientsOrInstructionsChanged', () => {
  test('returns false when ingredients and instructions are unchanged', () => {
    expect(
      ingredientsOrInstructionsChanged(
        {
          ingredients: [{name: 'Flour', quantity: 2, unit: 'cups'}],
          instructions: [{body: 'Mix'}],
        },
        {
          ingredients: [{name: 'Flour', quantity: 2, unit: 'cups'}],
          instructions: [{body: 'Mix'}],
        },
      ),
    ).toBe(false);
  });

  test('detects ingredient changes', () => {
    expect(
      ingredientsOrInstructionsChanged(
        {
          ingredients: [{name: 'Flour', quantity: 2, unit: 'cups'}],
          instructions: [{body: 'Mix'}],
        },
        {
          ingredients: [{name: 'Flour', quantity: 3, unit: 'cups'}],
          instructions: [{body: 'Mix'}],
        },
      ),
    ).toBe(true);
  });

  test('detects instruction-only changes', () => {
    expect(
      ingredientsOrInstructionsChanged(
        {
          ingredients: [{name: 'Flour', quantity: 2, unit: 'cups'}],
          instructions: [{body: 'Mix gently'}],
        },
        {
          ingredients: [{name: 'Flour', quantity: 2, unit: 'cups'}],
          instructions: [{body: 'Mix vigorously'}],
        },
      ),
    ).toBe(true);
  });

  test('treats missing proposed quantity as null', () => {
    expect(
      ingredientsOrInstructionsChanged(
        {
          ingredients: [{name: 'Flour', quantity: 2, unit: 'cups'}],
          instructions: [{body: 'Mix'}],
        },
        {
          ingredients: [{name: 'Flour', unit: 'cups'}],
          instructions: [{body: 'Mix'}],
        },
      ),
    ).toBe(true);
  });

  test('treats missing proposed unit as null', () => {
    expect(
      ingredientsOrInstructionsChanged(
        {
          ingredients: [{name: 'Flour', quantity: 2, unit: null}],
          instructions: [{body: 'Mix'}],
        },
        {
          ingredients: [{name: 'Flour', quantity: 2, unit: 'cups'}],
          instructions: [{body: 'Mix'}],
        },
      ),
    ).toBe(true);
  });

  test('preserves zero quantity in comparison', () => {
    expect(
      ingredientsOrInstructionsChanged(
        {
          ingredients: [{name: 'Flour', quantity: 0, unit: null}],
          instructions: [{body: 'Mix'}],
        },
        {
          ingredients: [{name: 'Flour', quantity: 0, unit: null}],
          instructions: [{body: 'Mix'}],
        },
      ),
    ).toBe(false);
  });
});
