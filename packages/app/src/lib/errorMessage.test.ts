import {errorMessage} from './errorMessage';

describe('errorMessage', () => {
  test('returns error.message for Error instances', () => {
    expect(errorMessage(new Error('Something went wrong'))).toBe(
      'Something went wrong',
    );
  });

  test('returns fallback for non-Error values', () => {
    expect(errorMessage('just a string')).toBe('An unexpected error occurred');
    expect(errorMessage(42)).toBe('An unexpected error occurred');
    expect(errorMessage(null)).toBe('An unexpected error occurred');
    expect(errorMessage(void 0)).toBe('An unexpected error occurred');
  });
});
