import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {recipeDetailToInput} from '@recipoo/client';

import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {RecipeForm} from './RecipeForm.js';

describe('RecipeForm', () => {
  test('submits recipe input', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    );
    await userEvent.clear(screen.getByLabelText('Title'));
    await userEvent.type(screen.getByLabelText('Title'), 'Updated Title');
    await userEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(onSubmit.mock.calls[0]?.[0]?.title).toBe('Updated Title');
  });

  test('updates instruction text', async () => {
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    const instructionArea = screen
      .getAllByRole('textbox')
      .find(el => (el as HTMLTextAreaElement).rows === 2)!;
    await userEvent.clear(instructionArea);
    await userEvent.type(instructionArea, 'Updated step');
    expect(instructionArea).toHaveValue('Updated step');
  });

  test('adds and removes ingredients and instructions', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    );
    await userEvent.click(screen.getAllByText('+ Add')[0]!);
    await userEvent.click(screen.getAllByText('Remove')[0]!);
    await userEvent.click(screen.getAllByText('+ Add')[1]!);
    await waitFor(() => {
      expect(screen.getAllByText('Remove').length).toBeGreaterThan(2);
    });
    await userEvent.click(screen.getAllByText('Remove').at(-1)!);
  });

  test('shows error on failed submit', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Save failed'));
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    );
    await userEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
  });

  test('renders empty initial state and updates servings', async () => {
    await renderWithProviders(
      <RecipeForm
        initial={{
          title: '',
          servings: 4,
          ingredients: [],
          instructions: [],
          tagIds: [],
        }}
        submitLabel="Create"
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Servings'));
    await userEvent.type(screen.getByLabelText('Servings'), '6');
    expect(screen.getByLabelText('Servings')).toHaveValue(6);
  });

  test('updates optional fields and ingredient quantities', async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    );
    await userEvent.type(screen.getByLabelText('Description'), 'Desc');
    await userEvent.clear(screen.getByLabelText('Prep (min)'));
    await userEvent.type(screen.getByLabelText('Prep (min)'), '20');
    await userEvent.type(screen.getByLabelText('Image URL'), 'https://img.com');
    await userEvent.type(
      screen.getByLabelText('Source URL'),
      'https://src.com',
    );
    const qty = screen.getAllByPlaceholderText('Qty')[0]!;
    await userEvent.clear(qty);
    await userEvent.type(qty, '3');
    const unit = screen.getAllByPlaceholderText('Unit')[0]!;
    await userEvent.clear(unit);
    await userEvent.type(screen.getByLabelText('Cook (min)'), '45');
    const removeButtons = screen.getAllByText('Remove');
    await userEvent.click(removeButtons.at(-1)!);
    const instructionArea = screen
      .getAllByRole('textbox')
      .find(el => (el as HTMLTextAreaElement).rows === 2)!;
    await userEvent.type(instructionArea, ' extra');
    await userEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    const submitted = onSubmit.mock.calls[0]?.[0];
    expect(submitted?.ingredients[0]?.quantity).toBe(3);
  });

  test('shows generic error for non-Error throws', async () => {
    const onSubmit = vi.fn().mockRejectedValue('bad');
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    );
    await userEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(screen.getByText('Failed to save')).toBeInTheDocument();
    });
  });
});
