import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {downloadRecipeExportBundle} from '../lib/downloadRecipeExport.js';
import {recipoo} from '../lib/api.js';
import {renderWithProviders} from '../test/testUtils.js';

import {RecipeExportPicker} from './RecipeExportPicker.js';

vi.mock('../lib/downloadRecipeExport.js', () => ({
  downloadRecipeExportBundle: vi.fn(),
}));

describe('RecipeExportPicker', () => {
  test('filters recipes and exports the selected ones', async () => {
    const onError = vi.fn();
    await renderWithProviders(
      <RecipeExportPicker
        disabled={false}
        onError={onError}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });

    await userEvent.type(
      screen.getByPlaceholderText('Search recipes to export…'),
      'missing',
    );
    expect(screen.getByText('No recipes found.')).toBeInTheDocument();

    await userEvent.clear(
      screen.getByPlaceholderText('Search recipes to export…'),
    );
    await userEvent.click(screen.getByRole('button', {name: 'Select all'}));
    await userEvent.click(
      screen.getByRole('button', {name: /Export selected/i}),
    );

    await waitFor(() => {
      expect(downloadRecipeExportBundle).toHaveBeenCalled();
    });
    expect(onError).toHaveBeenCalledWith(null);
  });

  test('clears the current selection', async () => {
    await renderWithProviders(
      <RecipeExportPicker
        disabled={false}
        onError={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', {name: 'Select all'}));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', {name: 'Clear selection'}),
    );
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
  });

  test('can deselect an individual recipe', async () => {
    await renderWithProviders(
      <RecipeExportPicker
        disabled={false}
        onError={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox', {name: /Test Recipe/i});
    await userEvent.click(checkbox);
    await userEvent.click(checkbox);
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
  });

  test('reports export failures', async () => {
    const onError = vi.fn();
    vi.spyOn(recipoo.recipes, 'exportRecipes').mockRejectedValueOnce(
      new Error('Export failed badly'),
    );

    await renderWithProviders(
      <RecipeExportPicker
        disabled={false}
        onError={onError}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('checkbox', {name: /Test Recipe/i}));
    await userEvent.click(
      screen.getByRole('button', {name: /Export selected/i}),
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Export failed badly');
    });
  });

  test('reports generic export failures', async () => {
    const onError = vi.fn();
    vi.spyOn(recipoo.recipes, 'exportRecipes').mockRejectedValueOnce('nope');

    await renderWithProviders(
      <RecipeExportPicker
        disabled={false}
        onError={onError}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('checkbox', {name: /Test Recipe/i}));
    await userEvent.click(
      screen.getByRole('button', {name: /Export selected/i}),
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith('Export failed');
    });
  });
});
