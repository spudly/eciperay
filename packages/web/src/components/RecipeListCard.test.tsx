import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {renderWithProviders} from '../test/testUtils.js';

import {RecipeListCard} from './RecipeListCard.js';

describe('RecipeListCard', () => {
  test('opens cook log form from list action', async () => {
    await renderWithProviders(
      <RecipeListCard
        recipe={makeRecipeDetail({title: 'Pasta'})}
        onDelete={vi.fn()}
        onPress={vi.fn()}
      />,
    );

    expect(screen.getByText('Pasta')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Log cook'));
    expect(screen.getByText('How did it go?')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Skip'));
    expect(screen.queryByText('How did it go?')).not.toBeInTheDocument();
  });

  test('shows a pointer cursor on the card button when onPress is given', async () => {
    await renderWithProviders(
      <RecipeListCard
        recipe={makeRecipeDetail({title: 'Pasta'})}
        onDelete={vi.fn()}
        onPress={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', {name: /Pasta/})).toHaveStyle({
      cursor: 'pointer',
    });
  });

  test('shows a pointer cursor on the card link when no onPress is given', async () => {
    await renderWithProviders(
      <RecipeListCard
        recipe={makeRecipeDetail({title: 'Pasta'})}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', {name: /Pasta/})).toHaveStyle({
      cursor: 'pointer',
    });
  });

  test('deletes only after the in-page confirmation', async () => {
    const onDelete = vi.fn();
    await renderWithProviders(
      <RecipeListCard
        recipe={makeRecipeDetail({title: 'Pasta'})}
        onDelete={onDelete}
        onPress={vi.fn()}
      />,
    );

    // First click arms the confirmation — it must not delete yet, and
    // must not depend on window.confirm (#263).
    await userEvent.click(screen.getByText('Delete'));
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByText('Confirm delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith('recipe-uuid-1');
  });

  test('cancelling the delete confirmation does not delete', async () => {
    const onDelete = vi.fn();
    await renderWithProviders(
      <RecipeListCard
        recipe={makeRecipeDetail({title: 'Pasta'})}
        onDelete={onDelete}
        onPress={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByText('Delete'));
    await userEvent.click(screen.getByText('Cancel'));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.queryByText('Confirm delete')).not.toBeInTheDocument();
  });

  test('disables the delete confirmation while a delete is in flight', async () => {
    await renderWithProviders(
      <RecipeListCard
        recipe={makeRecipeDetail({title: 'Pasta'})}
        onDelete={vi.fn()}
        onPress={vi.fn()}
        isDeleting
      />,
    );

    await userEvent.click(screen.getByText('Delete'));
    expect(screen.getByText('Deleting…')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  test('shows a delete error beside the card', async () => {
    await renderWithProviders(
      <RecipeListCard
        recipe={makeRecipeDetail({title: 'Pasta'})}
        onDelete={vi.fn()}
        onPress={vi.fn()}
        deleteError="Could not delete recipe: Delete failed on server"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not delete recipe: Delete failed on server',
    );
  });

  test('saves cook log from list', async () => {
    await renderWithProviders(
      <RecipeListCard
        recipe={makeRecipeDetail()}
        onDelete={vi.fn()}
        onPress={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByText('Log cook'));
    // The star rating is not clicked here: the card now renders the
    // design system CookLogForm (B7 cluster C6, design-system#130),
    // and @spudly/ui 1.13.0 renders the DS StarRatingInput's label as
    // a raw accessibilitylabel attribute on web (the leak
    // design-system#237 fixes in a later release), so there is no
    // role/label to query yet. The rating is optional — submitting
    // without it sends a null rating and still exercises the create
    // mutation end to end.
    await userEvent.type(
      screen.getByPlaceholderText('Notes from this cook (optional)'),
      'Weeknight favorite',
    );
    await userEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(screen.queryByText('How did it go?')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Log cook')).toBeInTheDocument();
  });
});
