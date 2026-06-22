import {WEB_APP_BASE_URL} from '@eciperay/client';
import {Share} from 'react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';

import {shareRecipe} from './shareRecipe';

jest.spyOn(Share, 'share').mockResolvedValue({action: 'sharedAction'});

const privateRecipeUrl = `${WEB_APP_BASE_URL}/recipes/recipe-uuid-1`;
const publicRecipeUrl = `${WEB_APP_BASE_URL}/recipe/recipe-uuid-1/test-recipe`;
const unlistedRecipeUrl = `${WEB_APP_BASE_URL}/recipe/recipe-uuid-1/test-recipe?t=share-token`;

describe('shareRecipe', () => {
  test('calls Share.share with the recipe title', async () => {
    const recipe = makeRecipeDetail({title: 'My Pasta'});
    await shareRecipe(recipe);
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({title: 'My Pasta'}),
    );
  });

  test('message contains ingredient names', async () => {
    const recipe = makeRecipeDetail();
    await shareRecipe(recipe);
    const {message} = (Share.share as jest.Mock).mock.calls[0][0];
    expect(message).toContain('Flour');
  });

  test('uses auth-gated URL for private recipes without sourceUrl', async () => {
    const recipe = makeRecipeDetail({sourceUrl: null});
    await shareRecipe(recipe);
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({url: privateRecipeUrl}),
    );
  });

  test('uses permalink URLs for public recipes', async () => {
    const recipe = makeRecipeDetail({visibility: 'public', sourceUrl: null});
    await shareRecipe(recipe);
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({url: publicRecipeUrl}),
    );
  });

  test('appends share token for unlisted recipes when provided', async () => {
    const recipe = makeRecipeDetail({visibility: 'unlisted', sourceUrl: null});
    await shareRecipe(recipe, {shareToken: 'share-token'});
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({url: unlistedRecipeUrl}),
    );
  });

  test('includes sourceUrl when present', async () => {
    const recipe = makeRecipeDetail({sourceUrl: 'https://example.com/recipe'});
    await shareRecipe(recipe);
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({url: 'https://example.com/recipe'}),
    );
  });
});
