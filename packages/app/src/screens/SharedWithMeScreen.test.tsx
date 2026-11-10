import React from 'react';

import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

import {SharedWithMeScreen} from './SharedWithMeScreen';

jest.mock('../lib/api');

const mockListSharedWithMe = api.recipes.listSharedWithMe as jest.Mock;
const mockReplace = jest.fn();

const screenProps = makeStackProps<RecipesStackParamList, 'SharedWithMe'>(
  'SharedWithMe',
  undefined,
  {replace: mockReplace},
);

/**
 * The standalone Shared-with-me screen is retired by the unified
 * Recipes browse (#412): this screen is now only a redirect so the
 * existing `shared-with-me` deep link lands on the Recipes list,
 * where shared recipes render in the own section. These tests pin
 * the redirect and that the screen no longer runs its own list
 * query or renders a list of its own.
 */
describe('SharedWithMeScreen redirect (#412)', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockListSharedWithMe.mockResolvedValue([]);
  });

  test('replaces itself with the Recipes list on mount', async () => {
    const {toJSON} = await renderWithProviders(
      <SharedWithMeScreen {...screenProps} />,
    );

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('RecipesList');
    // The redirect renders nothing of its own.
    expect(toJSON()).toBeNull();
  });

  test('does not fetch the shared-with-me list anymore', async () => {
    await renderWithProviders(<SharedWithMeScreen {...screenProps} />);

    expect(mockListSharedWithMe).not.toHaveBeenCalled();
  });
});
