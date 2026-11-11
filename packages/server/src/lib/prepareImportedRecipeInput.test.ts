import {jest} from '@jest/globals';
import type {RecipeImport} from '@eciperay/types';

import {createMockQuery} from '../test/mockQuery.js';
import {makeQueryResult} from '../test/fixtures/queryResult.js';

import {prepareImportedRecipeInput} from './prepareImportedRecipeInput.js';

const recipe: RecipeImport = {
  title: 'Soup',
  description: null,
  servings: 4,
  prepTimeMin: null,
  cookTimeMin: null,
  sourceUrl: null,
  ingredients: [
    {
      sortOrder: 0,
      name: 'broth',
      quantity: 1,
      unit: 'L',
      notes: null,
      isOptional: false,
    },
  ],
  instructions: [{stepNumber: 1, body: 'Simmer'}],
};

describe('prepareImportedRecipeInput', () => {
  test('fetches tags and includes selected tag ids in recipe input', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([
        {id: 'tag-dinner', name: 'Dinner'},
        {id: 'tag-quick', name: 'Quick'},
      ]),
    );
    const client = {
      messages: {
        create: jest
          .fn<() => Promise<{content: {type: string; text: string}[]}>>()
          .mockResolvedValue({
            content: [{type: 'text', text: JSON.stringify(['Dinner'])}],
          }),
      },
    };
    const input = await prepareImportedRecipeInput({
      recipe,
      userId: 'user-uuid-1',
      queryFn: mockQuery,
      client: client as never,
    });
    expect(input.tagIds).toEqual(['tag-dinner']);
  });

  test('forwards an active signal to the provider request via tag selection', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([{id: 'tag-dinner', name: 'Dinner'}]),
    );
    const create = jest
      .fn<() => Promise<{content: {type: string; text: string}[]}>>()
      .mockResolvedValue({
        content: [{type: 'text', text: JSON.stringify(['Dinner'])}],
      });
    const signal = new AbortController().signal;
    const input = await prepareImportedRecipeInput({
      recipe,
      userId: 'user-uuid-1',
      queryFn: mockQuery,
      client: {messages: {create}} as never,
      signal,
    });
    expect(input.tagIds).toEqual(['tag-dinner']);
    expect(create).toHaveBeenCalledTimes(1);
    // The active signal lets the request run: this exercises forwarding
    // into selectTagIdsForRecipe (not the post-query abort guard), and
    // the provider request must receive that same signal in its request
    // options ({signal} is the established request shape).
    const firstCall = create.mock.calls[0] as unknown as [
      unknown,
      {signal?: AbortSignal} | undefined,
    ];
    expect(firstCall[1]).toEqual({signal});
  });

  test('does not start tag selection when the signal aborted during the tag query', async () => {
    const mockQuery = createMockQuery();
    mockQuery.mockResolvedValueOnce(
      makeQueryResult([{id: 'tag-dinner', name: 'Dinner'}]),
    );
    const create = jest
      .fn<() => Promise<{content: {type: string; text: string}[]}>>()
      .mockResolvedValue({
        content: [{type: 'text', text: JSON.stringify(['Dinner'])}],
      });
    await expect(
      prepareImportedRecipeInput({
        recipe,
        userId: 'user-uuid-1',
        queryFn: mockQuery,
        client: {messages: {create}} as never,
        signal: AbortSignal.abort(),
      }),
    ).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
});
