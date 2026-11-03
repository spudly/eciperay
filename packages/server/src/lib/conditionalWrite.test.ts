import {
  resolveExpectedUpdatedAt,
  staleWriteConflict,
  updatedAtMatches,
  updatedAtToken,
} from './conditionalWrite.js';

describe('updatedAtToken', () => {
  test('normalizes Date instances to ISO strings', () => {
    expect(updatedAtToken(new Date('2024-01-01T00:00:00.000Z'))).toBe(
      '2024-01-01T00:00:00.000Z',
    );
  });

  test('normalizes equivalent ISO spellings to the same string', () => {
    expect(updatedAtToken('2024-01-01T00:00:00Z')).toBe(
      '2024-01-01T00:00:00.000Z',
    );
  });

  test('passes unparseable values through unchanged', () => {
    expect(updatedAtToken('not-a-date')).toBe('not-a-date');
  });
});

describe('updatedAtMatches', () => {
  test('matches a stored Date against the ISO token from a GET response', () => {
    expect(
      updatedAtMatches(
        new Date('2024-01-01T00:00:00.000Z'),
        '2024-01-01T00:00:00.000Z',
      ),
    ).toBe(true);
  });

  test('does not match a stale token', () => {
    expect(
      updatedAtMatches('2024-01-02T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
    ).toBe(false);
  });
});

describe('resolveExpectedUpdatedAt', () => {
  test('returns undefined when the request carries no token', () => {
    expect(resolveExpectedUpdatedAt(undefined, undefined)).toBeUndefined();
  });

  test('uses the body field when there is no header', () => {
    expect(
      resolveExpectedUpdatedAt(undefined, '2024-01-01T00:00:00.000Z'),
    ).toBe('2024-01-01T00:00:00.000Z');
  });

  test('prefers the If-Match header over the body field', () => {
    expect(
      resolveExpectedUpdatedAt(
        '"2024-01-02T00:00:00.000Z"',
        '2024-01-01T00:00:00.000Z',
      ),
    ).toBe('2024-01-02T00:00:00.000Z');
  });

  test('accepts bare and weak ETag header forms', () => {
    expect(
      resolveExpectedUpdatedAt('2024-01-01T00:00:00.000Z', undefined),
    ).toBe('2024-01-01T00:00:00.000Z');
    expect(
      resolveExpectedUpdatedAt('W/"2024-01-01T00:00:00.000Z"', undefined),
    ).toBe('2024-01-01T00:00:00.000Z');
  });

  test('treats If-Match: * as no specific token', () => {
    expect(resolveExpectedUpdatedAt('*', undefined)).toBeUndefined();
  });
});

describe('staleWriteConflict', () => {
  test('builds the 409 result in the API error shape', () => {
    expect(staleWriteConflict('Meal')).toEqual({
      error: 'Meal has been modified since it was loaded',
      status: 409,
    });
    expect(staleWriteConflict('Meal plan')).toEqual({
      error: 'Meal plan has been modified since it was loaded',
      status: 409,
    });
  });
});
