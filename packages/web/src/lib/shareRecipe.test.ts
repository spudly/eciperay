import {makeRecipeDetail} from '../test/fixtures/recipe.js';

import {shareRecipe} from './shareRecipe.js';

const privateRecipeUrl =
  'http://localhost:8081/recipe/recipe-uuid-1/test-recipe';
const privateShareUrl = `${privateRecipeUrl}?t=share-token`;
const publicRecipeUrl =
  'http://localhost:8081/recipe/recipe-uuid-1/test-recipe';
const unlistedRecipeUrl =
  'http://localhost:8081/recipe/recipe-uuid-1/test-recipe?t=share-token';

describe('shareRecipe', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {location: {origin: 'http://localhost:8081'}});
  });

  test('uses navigator.share when available, with title and URL only', async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal('navigator', {share, clipboard: {writeText: vi.fn()}});
    await expect(
      shareRecipe(makeRecipeDetail({sourceUrl: null})),
    ).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({
      title: expect.any(String),
      url: privateRecipeUrl,
    });
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

  test('appends share token for private recipes when provided (#534)', async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal('navigator', {share, clipboard: {writeText: vi.fn()}});
    await shareRecipe(makeRecipeDetail({sourceUrl: null}), {
      shareToken: 'share-token',
    });
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({url: privateShareUrl}),
    );
  });

  test('falls back to clipboard when share unavailable', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', {clipboard: {writeText}});
    await expect(shareRecipe(makeRecipeDetail())).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalled();
  });

  test('copies the share URL alone, never recipe text (#534)', async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', {clipboard: {writeText}});
    await expect(
      shareRecipe(makeRecipeDetail({sourceUrl: null, visibility: 'public'})),
    ).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith(publicRecipeUrl);
  });

  test('falls back to clipboard when share fails with a non-abort error', async () => {
    const share = vi.fn().mockRejectedValue(new Error('share failed'));
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', {share, clipboard: {writeText}});
    await expect(shareRecipe(makeRecipeDetail())).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalled();
  });

  test('never shares the source URL (#534)', async () => {
    const share = vi.fn(async () => {});
    vi.stubGlobal('navigator', {share, clipboard: {writeText: vi.fn()}});
    await shareRecipe(
      makeRecipeDetail({sourceUrl: 'https://example.com/original'}),
    );
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({url: privateRecipeUrl}),
    );
    expect(share).not.toHaveBeenCalledWith(
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
