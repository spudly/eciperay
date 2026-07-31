import {fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {http, HttpResponse} from 'msw';
import {vi} from 'vitest';

import {downloadRecipeExportBundle} from '../lib/downloadRecipeExport.js';
import {eciperay} from '../lib/api.js';
import {server} from '../test/msw/server.js';
import {renderWithProviders} from '../test/testUtils.js';
import {supabase} from '../lib/supabase.js';

import {ProfilePage} from './ProfilePage.js';

const mockUseAuth = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {...actual, useAuth: () => mockUseAuth()};
});

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {...actual, useNavigate: () => mockNavigate};
});

vi.mock('../lib/downloadRecipeExport.js', () => ({
  downloadRecipeExportBundle: vi.fn(),
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({session: {user: {email: 'test@example.com'}}});
    mockNavigate.mockReset();
  });

  test('opens the component showcase in dev', async () => {
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    await userEvent.click(screen.getByText('Component Showcase'));
    expect(mockNavigate).toHaveBeenCalledWith('/dev/components');
  });

  test('shows email and signs out', async () => {
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Sign Out'));
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  test('exports selected recipes', async () => {
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    await waitFor(() => {
      expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('checkbox', {name: /Test Recipe/i}));
    await userEvent.click(
      screen.getByRole('button', {name: /Export selected/i}),
    );

    await waitFor(() => {
      expect(downloadRecipeExportBundle).toHaveBeenCalledWith(
        expect.objectContaining({
          formatVersion: 1,
          recipes: expect.arrayContaining([
            expect.objectContaining({title: 'Test Recipe'}),
          ]),
        }),
      );
    });
  });

  test('opens the file picker when import is clicked', async () => {
    await renderWithProviders(<ProfilePage />, {withAuth: false});
    const fileInput = document.querySelector('input[type="file"]')!;
    const click = vi.fn();
    Object.defineProperty(fileInput, 'click', {value: click});

    await userEvent.click(screen.getByRole('button', {name: 'Import recipes'}));

    expect(click).toHaveBeenCalled();
  });

  test('shows an error for invalid import files', async () => {
    await renderWithProviders(<ProfilePage />, {withAuth: false});

    const file = Object.assign(
      new File(['{"recipes":[]}'], 'recipes.json', {type: 'application/json'}),
      {text: async () => '{"recipes":[]}'},
    );
    const fileInput = document.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, {target: {files: [file]}});

    await waitFor(() => {
      expect(screen.getByText(/non-empty recipes array/i)).toBeInTheDocument();
    });
  });

  test('shows a generic import error for unexpected failures', async () => {
    vi.spyOn(eciperay.import, 'importBulk').mockRejectedValueOnce('nope');
    await renderWithProviders(<ProfilePage />, {withAuth: false});

    const importJson = JSON.stringify({
      recipes: [
        {
          title: 'Imported Soup',
          description: null,
          servings: 4,
          prepTimeMin: null,
          cookTimeMin: null,
          starRating: null,
          sourceUrl: null,
          tags: [],
          ingredients: [
            {
              sortOrder: 0,
              name: 'Broth',
              quantity: 1,
              unit: 'cup',
              notes: null,
              isOptional: false,
            },
          ],
          instructions: [{stepNumber: 1, body: 'Simmer'}],
        },
      ],
    });
    const file = Object.assign(
      new File([importJson], 'recipes.json', {type: 'application/json'}),
      {text: async () => importJson},
    );
    const fileInput = document.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, {target: {files: [file]}});

    await waitFor(() => {
      expect(screen.getByText('Import failed')).toBeInTheDocument();
    });
  });

  test('imports recipes from a JSON file', async () => {
    const importJson = JSON.stringify({
      formatVersion: 1,
      exportedAt: '2024-01-01T00:00:00.000Z',
      recipes: [
        {
          title: 'Imported Soup',
          description: null,
          servings: 4,
          prepTimeMin: null,
          cookTimeMin: null,
          starRating: null,
          sourceUrl: null,
          tags: [],
          ingredients: [
            {
              sortOrder: 0,
              name: 'Broth',
              quantity: 1,
              unit: 'cup',
              notes: null,
              isOptional: false,
            },
          ],
          instructions: [{stepNumber: 1, body: 'Simmer'}],
        },
      ],
    });
    await renderWithProviders(<ProfilePage />, {withAuth: false});

    const file = Object.assign(
      new File([importJson], 'recipes.json', {type: 'application/json'}),
      {text: async () => importJson},
    );
    const fileInput = document.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, {target: {files: [file]}});

    await waitFor(() => {
      expect(screen.getByText(/Imported 1 recipe/i)).toBeInTheDocument();
    });
  });

  test('shows import errors returned by the API', async () => {
    server.use(
      http.post('http://localhost:8080/api/recipes/import/bulk', () =>
        HttpResponse.json({
          created: [],
          errors: [
            {index: 0, title: 'Bad Recipe', message: 'Validation failed'},
          ],
        }),
      ),
    );

    const importJson = JSON.stringify({
      recipes: [
        {
          title: 'Bad Recipe',
          description: null,
          servings: 1,
          prepTimeMin: null,
          cookTimeMin: null,
          starRating: null,
          sourceUrl: null,
          tags: [],
          ingredients: [],
          instructions: [],
        },
      ],
    });
    await renderWithProviders(<ProfilePage />, {withAuth: false});

    const file = Object.assign(
      new File([importJson], 'recipes.json', {type: 'application/json'}),
      {text: async () => importJson},
    );
    const fileInput = document.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, {target: {files: [file]}});

    await waitFor(() => {
      expect(screen.getByText(/Validation failed/i)).toBeInTheDocument();
    });
  });
});
