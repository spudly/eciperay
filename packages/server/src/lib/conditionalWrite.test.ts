import {
  resolveExpectedUpdatedAts,
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

describe('resolveExpectedUpdatedAts', () => {
  test('returns no tokens when the request carries no token', () => {
    expect(resolveExpectedUpdatedAts(undefined, undefined)).toEqual([]);
  });

  test('uses the body field when there is no header', () => {
    expect(
      resolveExpectedUpdatedAts(undefined, '2024-01-01T00:00:00.000Z'),
    ).toEqual(['2024-01-01T00:00:00.000Z']);
  });

  test('prefers the If-Match header over the body field', () => {
    expect(
      resolveExpectedUpdatedAts(
        '"2024-01-02T00:00:00.000Z"',
        '2024-01-01T00:00:00.000Z',
      ),
    ).toEqual(['2024-01-02T00:00:00.000Z']);
  });

  test('accepts bare and weak ETag header forms', () => {
    expect(
      resolveExpectedUpdatedAts('2024-01-01T00:00:00.000Z', undefined),
    ).toEqual(['2024-01-01T00:00:00.000Z']);
    expect(
      resolveExpectedUpdatedAts('W/"2024-01-01T00:00:00.000Z"', undefined),
    ).toEqual(['2024-01-01T00:00:00.000Z']);
  });

  test('preserves every If-Match candidate for any-match evaluation', () => {
    expect(
      resolveExpectedUpdatedAts(
        '"2023-06-01T00:00:00.000Z", W/"2024-01-01T00:00:00.000Z"',
        undefined,
      ),
    ).toEqual(['2023-06-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z']);
  });

  test('treats an If-Match list containing * as no specific token', () => {
    expect(resolveExpectedUpdatedAts('*', undefined)).toEqual([]);
    expect(
      resolveExpectedUpdatedAts('"2024-01-01T00:00:00.000Z", *', undefined),
    ).toEqual([]);
  });

  test('falls back to the body field when the header has no candidates', () => {
    expect(
      resolveExpectedUpdatedAts(' , ', '2024-01-01T00:00:00.000Z'),
    ).toEqual(['2024-01-01T00:00:00.000Z']);
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
