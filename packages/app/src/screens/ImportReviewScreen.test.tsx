import React from 'react';
import {act, fireEvent, waitFor} from '@testing-library/react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

import {ImportReviewScreen} from './ImportReviewScreen';

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

const mockGet = api.recipes.get as jest.Mock;
const mockAcceptImport = api.recipes.acceptImport as jest.Mock;
const mockStartImportEdits = api.versions.startImportEdits as jest.Mock;
const mockParentNavigate = jest.fn();
const mockGetParent = jest.fn().mockReturnValue({navigate: mockParentNavigate});
const stackProps = makeStackProps<AddStackParamList, 'ImportReview'>(
  'ImportReview',
  {recipeId: 'recipe-uuid-1'},
  {getParent: mockGetParent},
);

describe('ImportReviewScreen', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue(makeRecipeDetail());
    mockAcceptImport.mockResolvedValue(makeRecipeDetail());
    mockStartImportEdits.mockResolvedValue({
      id: 'version-draft-2',
      versionNumber: 2,
    });
    mockParentNavigate.mockReset();
  });

  test('accepts import and navigates to recipe detail', async () => {
    const {findByText, getByText} = renderWithProviders(
      <ImportReviewScreen {...stackProps} />,
    );
    expect(await findByText('Review Import')).toBeTruthy();
    fireEvent.press(getByText('Looks good'));
    await waitFor(() => {
      expect(mockAcceptImport).toHaveBeenCalledWith('recipe-uuid-1');
    });
    expect(mockParentNavigate).toHaveBeenCalledWith('Recipes', {
      screen: 'RecipeDetail',
      params: {recipeId: 'recipe-uuid-1'},
    });
  });

  test('shows error when accept fails', async () => {
    mockAcceptImport.mockRejectedValue(new Error('Accept failed'));
    const {findByText, getByText} = renderWithProviders(
      <ImportReviewScreen {...stackProps} />,
    );
    expect(await findByText('Review Import')).toBeTruthy();
    fireEvent.press(getByText('Looks good'));
    expect(await findByText('Accept failed')).toBeTruthy();
  });

  test('renders hero image when recipe has imageUrl', async () => {
    mockGet.mockResolvedValue(
      makeRecipeDetail({imageUrl: 'https://example.com/pasta.jpg'}),
    );
    const {findByText} = renderWithProviders(
      <ImportReviewScreen {...stackProps} />,
    );
    expect(await findByText('Review Import')).toBeTruthy();
  });

  test('uses v1 label when version number is missing', async () => {
    mockGet.mockResolvedValue({
      ...makeRecipeDetail(),
      versionNumber: undefined,
    });
    const {findByText} = renderWithProviders(
      <ImportReviewScreen {...stackProps} />,
    );
    expect(await findByText(/imported recipe \(v1\)/i)).toBeTruthy();
  });

  test('shows error when start edits fails', async () => {
    mockStartImportEdits.mockRejectedValue(new Error('Draft failed'));
    const {findByText, getByText} = renderWithProviders(
      <ImportReviewScreen {...stackProps} />,
    );
    expect(await findByText('Review Import')).toBeTruthy();
    fireEvent.press(getByText('Make edits'));
    expect(await findByText('Draft failed')).toBeTruthy();
  });

  test('shows pending labels while actions are running', async () => {
    let resolveAccept: (value: unknown) => void = () => {};
    mockAcceptImport.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveAccept = resolve;
        }),
    );
    const {findByText, getByText} = renderWithProviders(
      <ImportReviewScreen {...stackProps} />,
    );
    expect(await findByText('Review Import')).toBeTruthy();
    await act(async () => {
      fireEvent.press(getByText('Looks good'));
    });
    expect(getByText('Saving…')).toBeTruthy();
    await act(async () => {
      resolveAccept(makeRecipeDetail());
    });
    await waitFor(() => {
      expect(mockAcceptImport).toHaveBeenCalled();
    });
  });

  test('shows creating draft label while starting edits', async () => {
    let resolveEdits: (value: unknown) => void = () => {};
    mockStartImportEdits.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveEdits = resolve;
        }),
    );
    const {findByText, getByText} = renderWithProviders(
      <ImportReviewScreen {...stackProps} />,
    );
    expect(await findByText('Review Import')).toBeTruthy();
    await act(async () => {
      fireEvent.press(getByText('Make edits'));
    });
    expect(getByText('Creating draft…')).toBeTruthy();
    await act(async () => {
      resolveEdits({id: 'version-draft-2', versionNumber: 2});
    });
    await waitFor(() => {
      expect(mockStartImportEdits).toHaveBeenCalled();
    });
  });

  test('starts import edits and navigates to edit version', async () => {
    const {findByText, getByText} = renderWithProviders(
      <ImportReviewScreen {...stackProps} />,
    );
    expect(await findByText('Review Import')).toBeTruthy();
    fireEvent.press(getByText('Make edits'));
    await waitFor(() => {
      expect(mockStartImportEdits).toHaveBeenCalledWith('recipe-uuid-1');
    });
    expect(mockParentNavigate).toHaveBeenCalledWith('Recipes', {
      screen: 'EditVersion',
      params: {recipeId: 'recipe-uuid-1', versionId: 'version-draft-2'},
    });
  });
});
