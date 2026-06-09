import {makeRecipeDetail} from '../test/fixtures/recipe.js';

import {shareRecipe} from './shareRecipe.js';

describe('shareRecipe', () => {
  test('uses navigator.share when available', async () => {
    const share = vi.fn().mockResolvedValue();
    vi.stubGlobal('navigator', {share, clipboard: {writeText: vi.fn()}});
    await shareRecipe(makeRecipeDetail());
    expect(share).toHaveBeenCalled();
  });

  test('falls back to clipboard when share unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue();
    vi.stubGlobal('navigator', {clipboard: {writeText}});
    await shareRecipe(makeRecipeDetail());
    expect(writeText).toHaveBeenCalled();
  });

  test('share omits url when sourceUrl is null', async () => {
    const share = vi.fn().mockResolvedValue();
    vi.stubGlobal('navigator', {share, clipboard: {writeText: vi.fn()}});
    await shareRecipe(makeRecipeDetail({sourceUrl: null}));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({url: undefined}),
    );
  });
});
