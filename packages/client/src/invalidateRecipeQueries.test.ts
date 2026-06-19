import {QueryClient} from '@tanstack/react-query';

import {invalidateRecipeQueries} from './invalidateRecipeQueries.js';

describe('invalidateRecipeQueries', () => {
  test('invalidates all recipe-related query keys', async () => {
    const queryClient = new QueryClient();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    await invalidateRecipeQueries(queryClient, 'recipe-1', 'version-1');
    expect(spy).toHaveBeenCalledTimes(6);
    expect(spy).toHaveBeenCalledWith({queryKey: ['recipes']});
    expect(spy).toHaveBeenCalledWith({queryKey: ['recipe', 'recipe-1']});
    expect(spy).toHaveBeenCalledWith({queryKey: ['versions', 'recipe-1']});
    expect(spy).toHaveBeenCalledWith({queryKey: ['nutrition', 'recipe-1']});
    expect(spy).toHaveBeenCalledWith({
      queryKey: ['version', 'recipe-1', 'version-1'],
    });
    expect(spy).toHaveBeenCalledWith({
      queryKey: ['cookLogs', 'recipe-1', 'version-1'],
    });
  });

  test('skips version-specific keys when versionId omitted', async () => {
    const queryClient = new QueryClient();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    await invalidateRecipeQueries(queryClient, 'recipe-1');
    expect(spy).toHaveBeenCalledTimes(4);
  });
});
