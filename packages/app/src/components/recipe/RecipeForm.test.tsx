import {recipeDetailToInput} from '@recipoo/client';
import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

import {makeRecipeDetail} from '../../__tests__/fixtures/recipe';
import {renderWithProviders} from '../../__tests__/testUtils';
import {api} from '../../lib/api';

import {RecipeForm} from './RecipeForm';

jest.mock('../../lib/api');

const mockListTags = api.tags.list as jest.Mock;

const renderForm = async (ui: React.ReactElement) => {
  const screen = render(renderWithProviders(ui));
  await waitFor(() => {
    expect(screen.queryByText('Loading tags…')).toBeNull();
  });
  return screen;
};

describe('RecipeForm', () => {
  beforeEach(() => {
    mockListTags.mockResolvedValue([]);
  });

  test('submits recipe input', async () => {
    const onSubmit = jest.fn().mockResolvedValue();
    const {getByText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.press(getByText('Save'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  test('shows generic error on non-Error failure', async () => {
    const onSubmit = jest.fn().mockRejectedValue('nope');
    const {getByText, findByText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.press(getByText('Save'));
    expect(await findByText('Failed to save')).toBeTruthy();
  });

  test('shows error on failed submit', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('Save failed'));
    const {getByText, findByText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.press(getByText('Save'));
    expect(await findByText('Save failed')).toBeTruthy();
  });

  test('adds and removes ingredients and instructions', async () => {
    const onSubmit = jest.fn().mockResolvedValue();
    const {getAllByText, getByText, getAllByPlaceholderText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.changeText(getAllByPlaceholderText('Qty')[0], '3');
    fireEvent.changeText(getAllByPlaceholderText('Qty')[0], '');
    fireEvent.changeText(getAllByPlaceholderText('Unit')[0], 'cups');
    fireEvent.changeText(getAllByPlaceholderText('Unit')[0], '');
    fireEvent.press(getAllByText('+ Add')[0]);
    fireEvent.press(getAllByText('Remove')[0]);
    fireEvent.press(getAllByText('+ Add')[1]);
    fireEvent.press(getAllByText('Remove').at(-1)!);
    fireEvent.press(getByText('Save'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  test('updates instruction body text', async () => {
    const {getByDisplayValue} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    const step = getByDisplayValue('Mix dry ingredients');
    fireEvent.changeText(step, 'Updated step');
    expect(step.props.value).toBe('Updated step');
  });

  test('submits string quantity as a number', async () => {
    const onSubmit = jest.fn().mockResolvedValue();
    const {getByText, getAllByPlaceholderText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.changeText(getAllByPlaceholderText('Qty')[0], '1.5');
    fireEvent.press(getByText('Save'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(onSubmit.mock.calls[0]?.[0]?.ingredients[0]?.quantity).toBe(1.5);
  });

  test('renders null quantity ingredient as empty qty field', async () => {
    const recipe = recipeDetailToInput(
      makeRecipeDetail({
        ingredients: [
          {
            sortOrder: 0,
            name: 'Salt',
            quantity: null,
            unit: null,
            notes: null,
            isOptional: false,
          } as const,
        ],
      }),
    );
    const {getAllByPlaceholderText} = await renderForm(
      <RecipeForm
        initial={recipe}
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    expect(getAllByPlaceholderText('Qty')[0].props.value).toBe('');
  });

  test('renders empty initial state and updates metadata fields', async () => {
    const {getAllByDisplayValue} = await renderForm(
      <RecipeForm
        initial={{
          title: '',
          servings: 4,
          ingredients: [],
          instructions: [],
          tagIds: [],
        }}
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    const titleInput = getAllByDisplayValue('')[0];
    fireEvent.changeText(titleInput, 'New Title');
    fireEvent.changeText(getAllByDisplayValue('4')[0], '6');
    expect(titleInput.props.value).toBe('New Title');
  });
});
