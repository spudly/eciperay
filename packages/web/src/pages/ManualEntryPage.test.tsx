import {uploadRecipeImage} from '@eciperay/client';
import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Route, Routes} from 'react-router-dom';

import {renderWithProviders} from '../test/testUtils.js';

import {ManualEntryPage} from './ManualEntryPage.js';

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {...actual, uploadRecipeImage: vi.fn()};
});

const mockUploadRecipeImage = vi.mocked(uploadRecipeImage);

// The design system form labels its title input "Title"; since
// @spudly/ui 1.15 the label is a real <label> tied to the input, so a
// standard label query finds the field (before the bump the label
// leaked into a raw accessibilitylabel attribute in jsdom).
const titleField = () => screen.getByLabelText('Title');

describe('ManualEntryPage', () => {
  beforeEach(() => {
    mockUploadRecipeImage.mockReset();
    mockUploadRecipeImage.mockResolvedValue('https://cdn.example/recipe.png');
  });

  test('creates recipe', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/add/manual"
          element={<ManualEntryPage />}
        />
        <Route
          path="/recipes/:recipeId"
          element={<div>Recipe Created</div>}
        />
      </Routes>,
      {route: '/add/manual'},
    );
    await userEvent.type(titleField()!, 'New Recipe');
    await userEvent.type(screen.getAllByPlaceholderText('Name')[0]!, 'Flour');
    const textareas = screen.getAllByRole('textbox');
    await userEvent.type(textareas.at(-1)!, 'Mix ingredients');
    await userEvent.click(screen.getByText('Create Recipe'));
    await waitFor(() => {
      expect(screen.getByText('Recipe Created')).toBeInTheDocument();
    });
    // These two tests drive the full DS RecipeFormPage through
    // userEvent typing; since the @spudly/ui 1.15 bump the form's
    // render cost pushes them past the 5s default when the suite
    // runs files in parallel on a loaded machine (they pass
    // standalone), so they carry an explicit timeout.
  }, 15_000);

  test('uploads a pending image after the recipe is created', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/add/manual"
          element={<ManualEntryPage />}
        />
        <Route
          path="/recipes/:recipeId"
          element={<div>Recipe Created</div>}
        />
      </Routes>,
      {route: '/add/manual'},
    );
    await userEvent.type(titleField()!, 'New Recipe');
    await userEvent.type(screen.getAllByPlaceholderText('Name')[0]!, 'Flour');
    const textareas = screen.getAllByRole('textbox');
    await userEvent.type(textareas.at(-1)!, 'Mix ingredients');
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    await userEvent.upload(screen.getByLabelText('Browse images'), file);
    await userEvent.click(screen.getByText('Create Recipe'));
    await waitFor(() => {
      expect(mockUploadRecipeImage).toHaveBeenCalledWith(
        expect.anything(),
        file,
        'user-1',
        'new-recipe-id',
      );
    });
    await waitFor(() => {
      expect(screen.getByText('Recipe Created')).toBeInTheDocument();
    });
  }, 15_000);
});
