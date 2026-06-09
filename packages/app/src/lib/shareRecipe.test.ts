import {Share} from 'react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';

import {shareRecipe} from './shareRecipe';

jest.spyOn(Share, 'share').mockResolvedValue({action: 'sharedAction'});

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

  test('includes sourceUrl when present', async () => {
    const recipe = makeRecipeDetail({sourceUrl: 'https://example.com/recipe'});
    await shareRecipe(recipe);
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({url: 'https://example.com/recipe'}),
    );
  });

  test('url is undefined when sourceUrl is null', async () => {
    const recipe = makeRecipeDetail({sourceUrl: null});
    await shareRecipe(recipe);
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({url: undefined}),
    );
  });
});
