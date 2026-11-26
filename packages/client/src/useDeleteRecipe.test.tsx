import {act, renderHook, waitFor} from '@testing-library/react';

import type {EciperayClient} from './createEciperayClient.js';
import {makeHookWrapper} from './test/hookTestUtils.js';
import {useDeleteRecipe} from './useDeleteRecipe.js';

describe('useDeleteRecipe', () => {
  test('deletes, cleans history, and reports deletion', async () => {
    const deleteFn = jest.fn().mockResolvedValue(undefined);
    const client = {
      recipes: {delete: deleteFn},
    } as unknown as EciperayClient;
    const removeFromHistory = jest.fn().mockResolvedValue(undefined);
    const onDeleted = jest.fn();
    const {wrapper} = makeHookWrapper();
    const {result} = renderHook(
      () =>
        useDeleteRecipe(client, 'recipe-uuid-1', {
          onDeleted,
          removeFromHistory,
        }),
      {wrapper},
    );
    act(() => {
      result.current.deleteRecipe();
    });
    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalled();
    });
    expect(deleteFn).toHaveBeenCalledWith('recipe-uuid-1');
    expect(removeFromHistory).toHaveBeenCalled();
  });

  test('surfaces errors through onError and skips onDeleted', async () => {
    const failure = new Error('delete failed');
    const client = {
      recipes: {delete: jest.fn().mockRejectedValue(failure)},
    } as unknown as EciperayClient;
    const onDeleted = jest.fn();
    const onError = jest.fn();
    const {wrapper} = makeHookWrapper();
    const {result} = renderHook(
      () => useDeleteRecipe(client, 'recipe-uuid-1', {onDeleted, onError}),
      {wrapper},
    );
    act(() => {
      result.current.deleteRecipe();
    });
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(failure);
    });
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
