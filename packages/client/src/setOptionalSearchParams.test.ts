import {setOptionalSearchParams} from './setOptionalSearchParams.js';

describe('setOptionalSearchParams', () => {
  test('sets string and number values and skips empty or undefined', () => {
    const search = new URLSearchParams();
    setOptionalSearchParams(search, {
      q: 'pasta',
      limit: 20,
      empty: '',
      missing: undefined,
    });
    expect(search.toString()).toBe('q=pasta&limit=20');
  });
});
