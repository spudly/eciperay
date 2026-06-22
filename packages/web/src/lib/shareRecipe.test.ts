import {makeRecipeDetail} from '../test/fixtures/recipe.js';

import {shareRecipe} from './shareRecipe.js';

const privateRecipeUrl = 'http://localhost:8081/recipes/recipe-uuid-1';
const publicRecipeUrl =
  'http://localhost:8081/recipe/recipe-uuid-1/test-recipe';
const unlistedRecipeUrl =
  'http://localhost:8081/recipe/recipe-uuid-1/test-recipe?t=share-token';

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
      expect.objectContaining({url: privateRecipeUrl}),
    );
  });

  test('uses permalink URLs for published recipes', async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal('navigator', {share, clipboard: {writeText: vi.fn()}});
    await shareRecipe(
      makeRecipeDetail({visibility: 'public', sourceUrl: null}),
    );
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({url: publicRecipeUrl}),
    );
  });

  test('appends share token for unlisted recipes when provided', async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal('navigator', {share, clipboard: {writeText: vi.fn()}});
    await shareRecipe(
      makeRecipeDetail({visibility: 'unlisted', sourceUrl: null}),
      {shareToken: 'share-token'},
    );
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({url: unlistedRecipeUrl}),
    );
  });

  test('falls back to clipboard when share unavailable', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', {clipboard: {writeText}});
    await expect(shareRecipe(makeRecipeDetail())).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalled();
  });

  test('copies formatted recipe text with share URL', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', {clipboard: {writeText}});
    await expect(
      shareRecipe(makeRecipeDetail({sourceUrl: null, visibility: 'public'})),
    ).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining(publicRecipeUrl),
    );
  });

  test('falls back to clipboard when share fails with a non-abort error', async () => {
    const share = vi.fn().mockRejectedValue(new Error('share failed'));
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', {share, clipboard: {writeText}});
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
