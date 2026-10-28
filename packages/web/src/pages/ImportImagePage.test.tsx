import {fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Route, Routes} from 'react-router-dom';

import {eciperay} from '../lib/api.js';
import {renderWithProviders} from '../test/testUtils.js';

import {ImportImagePage} from './ImportImagePage.js';

describe('ImportImagePage', () => {
  test('pick buttons trigger their file inputs', async () => {
    await renderWithProviders(<ImportImagePage />, {route: '/add/image'});
    const libraryInput = screen.getByLabelText('Upload recipe image');
    const cameraInput = screen.getByLabelText('Take a photo of a recipe');
    const libraryClick = vi.spyOn(libraryInput, 'click');
    const cameraClick = vi.spyOn(cameraInput, 'click');
    await userEvent.click(screen.getByText('Choose from Library'));
    expect(libraryClick).toHaveBeenCalled();
    await userEvent.click(screen.getByText('Take Photo'));
    expect(cameraClick).toHaveBeenCalled();
  });

  test('imports from image file', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/add/image"
          element={<ImportImagePage />}
        />
        <Route
          path="/import/review/:recipeId"
          element={<div>Review</div>}
        />
      </Routes>,
      {route: '/add/image'},
    );
    const file = new File(['test'], 'recipe.png', {type: 'image/png'});
    const input = screen.getByLabelText('Upload recipe image');
    await userEvent.upload(input, file);
    await waitFor(() => {
      expect(screen.getByText('Review')).toBeInTheDocument();
    });
  });

  test('ignores empty file selection', async () => {
    await renderWithProviders(<ImportImagePage />, {route: '/add/image'});
    const input = screen.getByLabelText('Upload recipe image');
    fireEvent.change(input, {target: {files: []}});
    expect(screen.queryByText('Importing…')).not.toBeInTheDocument();
  });

  test('shows error when file read fails', async () => {
    const OriginalReader = global.FileReader;
    class FailingReader {
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.onerror?.();
      }
    }
    vi.stubGlobal('FileReader', FailingReader);
    await renderWithProviders(<ImportImagePage />, {route: '/add/image'});
    const file = new File(['test'], 'recipe.png', {type: 'image/png'});
    await userEvent.upload(screen.getByLabelText('Upload recipe image'), file);
    await waitFor(() => {
      expect(screen.getByText('Failed to read file')).toBeInTheDocument();
    });
    vi.stubGlobal('FileReader', OriginalReader);
  });

  test('reads file without data prefix', async () => {
    class RawReader {
      onload: (() => void) | null = null;
      result = 'rawbase64';
      readAsDataURL() {
        this.onload?.();
      }
    }
    vi.stubGlobal('FileReader', RawReader);
    await renderWithProviders(
      <Routes>
        <Route
          path="/add/image"
          element={<ImportImagePage />}
        />
        <Route
          path="/import/review/:recipeId"
          element={<div>Review</div>}
        />
      </Routes>,
      {route: '/add/image'},
    );
    await userEvent.upload(
      screen.getByLabelText('Upload recipe image'),
      new File(['test'], 'recipe.png', {type: 'image/png'}),
    );
    await waitFor(() => {
      expect(screen.getByText('Review')).toBeInTheDocument();
    });
  });

  test('shows generic error on import failure', async () => {
    vi.spyOn(eciperay.import, 'importImage').mockRejectedValueOnce('nope');
    await renderWithProviders(<ImportImagePage />, {route: '/add/image'});
    await userEvent.upload(
      screen.getByLabelText('Upload recipe image'),
      new File(['test'], 'recipe.png', {type: 'image/png'}),
    );
    await waitFor(() => {
      expect(screen.getByText('Import failed')).toBeInTheDocument();
    });
  });
});
