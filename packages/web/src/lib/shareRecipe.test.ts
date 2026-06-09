import {makeRecipeDetail} from '../test/fixtures/recipe.js';

import {shareRecipe} from './shareRecipe.js';

describe('shareRecipe', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {location: {origin: 'http://localhost:8081'}});
  });

  test('uses navigator.share when available', async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal('navigator', {share, clipboard: {writeText: vi.fn()}});
    await expect(
      shareRecipe(makeRecipeDetail({sourceUrl: null})),
    ).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://localhost:8081/recipes/recipe-uuid-1',
      }),
    );
  });

  test('falls back to clipboard when share unavailable', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', {clipboard: {writeText}});
    await expect(shareRecipe(makeRecipeDetail())).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalled();
  });

  test('uses sourceUrl when provided', async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal('navigator', {share, clipboard: {writeText: vi.fn()}});
    await shareRecipe(
      makeRecipeDetail({sourceUrl: 'https://example.com/original'}),
    );
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({url: 'https://example.com/original'}),
    );
  });

  test('rethrows when the user cancels the share sheet', async () => {
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    vi.stubGlobal('navigator', {share, clipboard: {writeText: vi.fn()}});
    await expect(shareRecipe(makeRecipeDetail())).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
