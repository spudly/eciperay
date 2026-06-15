import {QueryClient} from '@tanstack/react-query';

import {invalidateRecipeQueries} from './invalidateRecipeQueries.js';

describe('invalidateRecipeQueries', () => {
  test('invalidates all recipe-related query keys', async () => {
    const queryClient = new QueryClient();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    await invalidateRecipeQueries(queryClient, 'recipe-1');
    expect(spy).toHaveBeenCalledTimes(6);
    expect(spy).toHaveBeenCalledWith({queryKey: ['recipes', {search: ''}]});
    expect(spy).toHaveBeenCalledWith({queryKey: ['recipe', 'recipe-1']});
    expect(spy).toHaveBeenCalledWith({queryKey: ['notes', 'recipe-1']});
    expect(spy).toHaveBeenCalledWith({queryKey: ['conversation', 'recipe-1']});
    expect(spy).toHaveBeenCalledWith({queryKey: ['nutrition', 'recipe-1']});
    expect(spy).toHaveBeenCalledWith({queryKey: ['drafts', 'recipe-1']});
  });
});
