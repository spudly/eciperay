import React from 'react';
import {Alert, Pressable, Text} from 'react-native';
import {act, fireEvent} from '@testing-library/react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {renderWithProviders} from '../__tests__/testUtils';

import {api} from './api';
import {useDeleteRecipe} from './useDeleteRecipe';

jest.mock('./api');

const mockDelete = api.recipes.delete as jest.Mock;

const DeleteProbe = ({onDeleted}: {onDeleted: () => void}) => {
  const {confirmDelete} = useDeleteRecipe('recipe-uuid-1', onDeleted);
  return (
    <Pressable
      onPress={() => {
        confirmDelete(makeRecipeDetail());
      }}
    >
      <Text>Delete</Text>
    </Pressable>
  );
};

describe('useDeleteRecipe', () => {
  test('confirms and deletes a recipe', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const onDeleted = jest.fn();
    mockDelete.mockImplementation(async () => {});
    const {getByText} = renderWithProviders(
      <DeleteProbe onDeleted={onDeleted} />,
    );
    fireEvent.press(getByText('Delete'));
    const buttons = alertSpy.mock.calls[0]?.[2];
    await act(async () => {
      buttons?.[1]?.onPress?.();
    });
    expect(mockDelete).toHaveBeenCalledWith('recipe-uuid-1');
    alertSpy.mockRestore();
  });
});
