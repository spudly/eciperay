import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

import {ImportTextScreen} from './ImportTextScreen';

jest.mock('../lib/api');

const mockImportText = api.import.importText as jest.Mock;
const mockNavigate = jest.fn();
const stackProps = makeStackProps<AddStackParamList, 'ImportText'>(
  'ImportText',
  undefined,
  {navigate: mockNavigate},
);

describe('ImportTextScreen', () => {
  test('does not import when text is empty', async () => {
    const {findByText} = await renderWithProviders(
      <ImportTextScreen {...stackProps} />,
    );
    // Button should be disabled when text is empty
    // Find the Import text, then traverse up to the button with accessibilityState
    const importText = await findByText('Import');
    let importButton = importText.parent;
    // Traverse up until we find the element with accessibilityState
    while (importButton && !importButton.props.accessibilityState) {
      importButton = importButton.parent;
    }
    expect(importButton).toBeTruthy();
    // Assert the disabled accessibility state is exposed
    // (per Copilot review: directly assert disabled accessibility state)
    expect(importButton?.props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  test('imports text and navigates to review', async () => {
    mockImportText.mockResolvedValue(makeRecipeDetail({id: 'imported-1'}));
    const {getByPlaceholderText, getByText} = await renderWithProviders(
      <ImportTextScreen {...stackProps} />,
    );
    await fireEvent.changeText(
      getByPlaceholderText('Paste your recipe here…'),
      'Pasta\n\nBoil water.',
    );
    await fireEvent.press(getByText('Import'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ImportReview', {
        recipeId: 'imported-1',
      });
    });
  });

  test('warns on a duplicate, then imports anyway on resubmit (#296)', async () => {
    const duplicateError = Object.assign(
      new Error(
        'This recipe already exists in your library as "Pasta". Import anyway to create a second copy.',
      ),
      {code: 'duplicate_recipe'},
    );
    mockImportText
      .mockRejectedValueOnce(duplicateError)
      .mockResolvedValue(makeRecipeDetail({id: 'imported-2'}));
    const {getByPlaceholderText, getByText, findByText} =
      await renderWithProviders(<ImportTextScreen {...stackProps} />);
    await fireEvent.changeText(
      getByPlaceholderText('Paste your recipe here…'),
      'Pasta\n\nBoil water.',
    );
    await fireEvent.press(getByText('Import'));
    expect(
      await findByText(/already exists in your library/),
    ).toBeTruthy();
    expect(mockImportText).toHaveBeenLastCalledWith('Pasta\n\nBoil water.', {
      allowDuplicate: false,
    });
    await fireEvent.press(getByText('Import'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ImportReview', {
        recipeId: 'imported-2',
      });
    });
    expect(mockImportText).toHaveBeenLastCalledWith('Pasta\n\nBoil water.', {
      allowDuplicate: true,
    });
  });

  test('shows generic error on non-Error failure', async () => {
    mockImportText.mockRejectedValue('nope');
    const {getByPlaceholderText, getByText, findByText} =
      await renderWithProviders(<ImportTextScreen {...stackProps} />);
    await fireEvent.changeText(
      getByPlaceholderText('Paste your recipe here…'),
      'bad',
    );
    await fireEvent.press(getByText('Import'));
    expect(await findByText('Import failed')).toBeTruthy();
  });

  test('shows error on failure', async () => {
    mockImportText.mockRejectedValue(new Error('Parse failed'));
    const {getByPlaceholderText, getByText, findByText} =
      await renderWithProviders(<ImportTextScreen {...stackProps} />);
    await fireEvent.changeText(
      getByPlaceholderText('Paste your recipe here…'),
      'bad',
    );
    await fireEvent.press(getByText('Import'));
    expect(await findByText('Parse failed')).toBeTruthy();
  });
});
