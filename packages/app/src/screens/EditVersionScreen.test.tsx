import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {
  makeRecipeVersionDetail,
  VERSION_ID,
} from '../__tests__/fixtures/recipe';
import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {RecipesStackParamList} from '../navigation/types';

import {EditVersionScreen} from './EditVersionScreen';

jest.mock('../lib/api');
jest.mock('../lib/supabase', () => ({supabase: {}}));

jest.mock('@eciperay/client', () => {
  const actual = jest.requireActual('@eciperay/client');
  return {
    ...actual,
    useAuth: jest.fn(() => ({
      session: {user: {id: 'user-1'}},
      isLoading: false,
    })),
    uploadRecipeImageFromBase64: jest.fn(),
  };
});

const mockGet = api.versions.get as jest.Mock;
const mockPut = api.versions.put as jest.Mock;
const mockListTags = api.tags.list as jest.Mock;
const mockNavigate = jest.fn();
const stackProps = makeStackProps<RecipesStackParamList, 'EditVersion'>(
  'EditVersion',
  {recipeId: 'recipe-uuid-1', versionId: VERSION_ID},
  {navigate: mockNavigate},
);

describe('EditVersionScreen', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue(
      makeRecipeVersionDetail({derivedRole: 'draft', isEditable: true}),
    );
    mockPut.mockResolvedValue(makeRecipeVersionDetail());
    mockListTags.mockResolvedValue([]);
  });

  test('loads draft version and saves', async () => {
    const {findByText, getByText} = renderWithProviders(
      <EditVersionScreen {...stackProps} />,
    );
    expect(await findByText('Edit Draft (v1)')).toBeTruthy();
    fireEvent.press(getByText('Save Draft'));
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('RecipeDetail', {
        recipeId: 'recipe-uuid-1',
        versionId: VERSION_ID,
      });
    });
  });

  test('shows change summary for drafts', async () => {
    mockGet.mockResolvedValue(
      makeRecipeVersionDetail({
        derivedRole: 'draft',
        isEditable: true,
        changeSummary: 'Less sugar',
      }),
    );
    const {findByText} = renderWithProviders(
      <EditVersionScreen {...stackProps} />,
    );
    expect(await findByText('Less sugar')).toBeTruthy();
  });

  test('loads parent version for draft diffs', async () => {
    mockGet.mockImplementation((_recipeId: string, id: string) => {
      if (id === 'parent-1') {
        return Promise.resolve(
          makeRecipeVersionDetail({id: 'parent-1', versionNumber: 1}),
        );
      }
      return Promise.resolve(
        makeRecipeVersionDetail({
          derivedRole: 'draft',
          isEditable: true,
          derivedFromVersionId: 'parent-1',
          versionNumber: 2,
        }),
      );
    });
    const {findByText} = renderWithProviders(
      <EditVersionScreen {...stackProps} />,
    );
    expect(await findByText('Edit Draft (v2)')).toBeTruthy();
    expect(mockGet).toHaveBeenCalledWith('recipe-uuid-1', 'parent-1');
  });

  test('shows error for non-editable version', async () => {
    mockGet.mockResolvedValue(
      makeRecipeVersionDetail({derivedRole: 'active', isEditable: false}),
    );
    const {findByText} = renderWithProviders(
      <EditVersionScreen {...stackProps} />,
    );
    expect(
      await findByText('This version can no longer be edited.'),
    ).toBeTruthy();
    fireEvent.press(await findByText('Back to recipe'));
    expect(mockNavigate).toHaveBeenCalledWith('RecipeDetail', {
      recipeId: 'recipe-uuid-1',
    });
  });
});
