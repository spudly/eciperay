import {uploadRecipeImage} from '@eciperay/client';
import {fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {Route, Routes, useLocation} from 'react-router-dom';

import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';

import {EditRecipePage} from './EditRecipePage.js';

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {...actual, uploadRecipeImage: vi.fn()};
});

const mockUploadRecipeImage = vi.mocked(uploadRecipeImage);

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

describe('EditRecipePage', () => {
  beforeEach(() => {
    mockUploadRecipeImage.mockReset();
    mockUploadRecipeImage.mockResolvedValue('https://cdn.example/recipe.png');
  });
  test('loads and saves recipe', async () => {
    // The save response carries a slug that differs from the loaded
    // recipe's slug ('test-recipe'): navigation must use the returned
    // slug, so assert the exact destination pathname — both destination
    // routes render 'Saved', which alone would also pass for the old
    // bare-ID navigation.
    server.use(
      http.put('http://localhost:8080/api/recipes/:id', () =>
        HttpResponse.json(makeRecipeDetail({slug: 'renamed-recipe'})),
      ),
    );
    await renderWithProviders(
      <>
        <Routes>
          <Route
            path="/recipes/:recipeId/edit"
            element={<EditRecipePage />}
          />
          <Route
            path="/recipes/:recipeId"
            element={<div>Saved</div>}
          />
          <Route
            path="/recipes/:recipeId/:slug"
            element={<div>Saved</div>}
          />
        </Routes>
        <LocationProbe />
      </>,
      {route: '/recipes/recipe-uuid-1/edit'},
    );
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Recipe')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/recipes/recipe-uuid-1/renamed-recipe',
    );
  });

  test('blocks saving while a staged paste waits behind an image upload (#446)', async () => {
    let resolveUpload: (value: string) => void = () => undefined;
    mockUploadRecipeImage.mockImplementation(
      () =>
        new Promise<string>(resolve => {
          resolveUpload = resolve;
        }),
    );
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes/:recipeId/edit"
          element={<EditRecipePage />}
        />
        <Route
          path="/recipes/:recipeId"
          element={<div>Saved</div>}
        />
        <Route
          path="/recipes/:recipeId/:slug"
          element={<div>Saved</div>}
        />
      </Routes>,
      {route: '/recipes/recipe-uuid-1/edit'},
    );
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Recipe')).toBeInTheDocument();
    });
    // Select an image and open the crop dialog for it.
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    await userEvent.upload(
      document.querySelector('#recipe-image-upload') as HTMLElement,
      file,
    );
    const preview = screen.getByAltText('Recipe preview');
    Object.defineProperty(preview, 'naturalWidth', {value: 1200});
    Object.defineProperty(preview, 'naturalHeight', {value: 900});
    fireEvent.load(preview);
    await userEvent.click(screen.getByRole('button', {name: 'Crop image'}));
    expect(
      screen.getByRole('dialog', {name: 'Crop recipe image'}),
    ).toBeInTheDocument();
    // Paste another image outside the field while the crop dialog is
    // open: the host stages it, but the field refuses it for now.
    const pasted = new File(['pasted'], 'pasted.png', {type: 'image/png'});
    fireEvent.paste(screen.getByText('Save Changes'), {
      clipboardData: {files: [pasted], items: []},
    });
    // Cancelling the crop delivers the original image, whose upload
    // (deferred here) keeps the field busy, so the staged paste is
    // still not pending in the field.
    await userEvent.click(screen.getByRole('button', {name: 'Cancel crop'}));
    await waitFor(() => {
      expect(mockUploadRecipeImage).toHaveBeenCalledWith(
        expect.anything(),
        file,
        'user-1',
        'recipe-uuid-1',
      );
    });
    // Saving now must be blocked: the staged paste has not been
    // accepted, and a save would persist and leave the page without it.
    await userEvent.click(screen.getByText('Save Changes'));
    expect(
      await screen.findByText(
        'Use, crop, or discard the selected image before saving.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    // Once the upload finishes, the field stages the pasted file as
    // the pending selection instead of dropping it.
    resolveUpload('https://cdn.example/recipe.png');
    expect(
      await screen.findByRole('button', {name: 'Use image'}),
    ).toBeInTheDocument();
    // The pasted file was staged, not uploaded: the only upload call
    // so far is the original image's.
    expect(
      mockUploadRecipeImage.mock.calls.map(call => (call[1] as File).name),
    ).toEqual(['recipe.png']);
  }, 15_000);

  test('shows the server error and stays on the form when the save is rejected (#418)', async () => {
    server.use(
      http.put('http://localhost:8080/api/recipes/:id', () =>
        HttpResponse.json(
          {error: 'Recipe cannot be modified in its current status'},
          {status: 409},
        ),
      ),
    );
    await renderWithProviders(
      <Routes>
        <Route
          path="/recipes/:recipeId/edit"
          element={<EditRecipePage />}
        />
        <Route
          path="/recipes/:recipeId"
          element={<div>Saved</div>}
        />
        <Route
          path="/recipes/:recipeId/:slug"
          element={<div>Saved</div>}
        />
      </Routes>,
      {route: '/recipes/recipe-uuid-1/edit'},
    );
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Recipe')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Save Changes'));
    expect(
      await screen.findByText(
        'Recipe cannot be modified in its current status',
      ),
    ).toBeInTheDocument();
    // The rejected edit is not presented as saved: no navigation away.
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });
});
