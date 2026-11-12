import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Route, Routes, useLocation} from 'react-router-dom';
import {beforeEach, describe, expect, test, vi} from 'vitest';

import {renderWithProviders} from '../test/testUtils.js';

import {ImportReviewPage} from './ImportReviewPage.js';

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const {mockAcceptImport, mockStartImportEdits} = vi.hoisted(() => ({
  mockAcceptImport: vi.fn(),
  mockStartImportEdits: vi.fn(),
}));

vi.mock('../lib/api.js', () => ({
  eciperay: {
    recipes: {
      get: vi.fn(async () => ({
        id: 'recipe-uuid-1',
        recipeId: 'recipe-uuid-1',
        versionId: 'version-uuid-1',
        versionNumber: 1,
        title: 'Imported Pasta',
        description: 'Tasty',
        servings: 4,
        prepTimeMin: 10,
        cookTimeMin: 20,
        ingredients: [
          {
            id: 'i1',
            sortOrder: 0,
            name: 'pasta',
            quantity: 400,
            unit: 'g',
            notes: null,
            isOptional: false,
          },
        ],
        instructions: [{id: 's1', stepNumber: 1, body: 'Cook pasta'}],
        tags: [],
        tagIds: [],
        imageUrl: null,
        sourceUrl: null,
        status: 'idea',
        createdVia: 'url',
        isContentLocked: true,
      })),
      acceptImport: mockAcceptImport,
    },
    versions: {startImportEdits: mockStartImportEdits},
  },
}));

describe('ImportReviewPage', () => {
  beforeEach(() => {
    mockAcceptImport.mockReset();
    mockStartImportEdits.mockReset();
    mockAcceptImport.mockResolvedValue({id: 'recipe-uuid-1'});
    mockStartImportEdits.mockResolvedValue({
      id: 'version-draft-2',
      versionNumber: 2,
    });
  });

  test('accepts import and navigates to recipe detail', async () => {
    // The accept response carries the stored slug: navigation must use
    // it, so assert the exact destination pathname — both destination
    // routes render 'Saved', which alone would also pass for bare-ID
    // navigation.
    mockAcceptImport.mockResolvedValue({
      id: 'recipe-uuid-1',
      slug: 'imported-pasta',
    });
    await renderWithProviders(
      <>
        <Routes>
          <Route
            path="/import/review/:recipeId"
            element={<ImportReviewPage />}
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
      {route: '/import/review/recipe-uuid-1'},
    );
    await waitFor(() => {
      expect(screen.getByText('Review Import')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', {name: 'Looks good'}));
    await waitFor(() => {
      expect(mockAcceptImport).toHaveBeenCalledWith('recipe-uuid-1');
    });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/recipes/recipe-uuid-1/imported-pasta',
    );
  });

  test('shows error when accept fails', async () => {
    mockAcceptImport.mockRejectedValue(new Error('Accept failed'));
    await renderWithProviders(
      <Routes>
        <Route
          path="/import/review/:recipeId"
          element={<ImportReviewPage />}
        />
      </Routes>,
      {route: '/import/review/recipe-uuid-1'},
    );
    await waitFor(() => {
      expect(screen.getByText('Imported Pasta')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', {name: 'Looks good'}));
    expect(await screen.findByText('Accept failed')).toBeInTheDocument();
  });

  test('shows error when start edits fails', async () => {
    mockStartImportEdits.mockRejectedValue(new Error('Draft failed'));
    await renderWithProviders(
      <Routes>
        <Route
          path="/import/review/:recipeId"
          element={<ImportReviewPage />}
        />
      </Routes>,
      {route: '/import/review/recipe-uuid-1'},
    );
    await waitFor(() => {
      expect(screen.getByText('Imported Pasta')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', {name: 'Make edits'}));
    expect(await screen.findByText('Draft failed')).toBeInTheDocument();
  });

  test('renders hero image when recipe has imageUrl', async () => {
    const {eciperay} = await import('../lib/api.js');
    vi.mocked(eciperay.recipes.get).mockResolvedValueOnce({
      id: 'recipe-uuid-1',
      recipeId: 'recipe-uuid-1',
      versionId: 'version-uuid-1',
      versionNumber: 1,
      title: 'Imported Pasta',
      description: 'Tasty',
      servings: 4,
      prepTimeMin: 10,
      cookTimeMin: 20,
      ingredients: [
        {
          id: 'i1',
          sortOrder: 0,
          name: 'pasta',
          quantity: 400,
          unit: 'g',
          notes: null,
          isOptional: false,
        },
      ],
      instructions: [{id: 's1', stepNumber: 1, body: 'Cook pasta'}],
      tags: [],
      tagIds: [],
      imageUrl: 'https://example.com/pasta.jpg',
      sourceUrl: null,
      status: 'idea',
      createdVia: 'url',
      isContentLocked: true,
    } as never);
    const {container} = await renderWithProviders(
      <Routes>
        <Route
          path="/import/review/:recipeId"
          element={<ImportReviewPage />}
        />
      </Routes>,
      {route: '/import/review/recipe-uuid-1'},
    );
    // The design system ImportReviewPage renders the hero image without an
    // accessible name (its contract has no imageAlt), so query the element.
    await waitFor(() => {
      expect(container.querySelector('img')).toHaveAttribute(
        'src',
        'https://example.com/pasta.jpg',
      );
    });
  });

  test('uses v1 label when version number is missing', async () => {
    const {eciperay} = await import('../lib/api.js');
    vi.mocked(eciperay.recipes.get).mockResolvedValueOnce({
      id: 'recipe-uuid-1',
      recipeId: 'recipe-uuid-1',
      versionId: 'version-uuid-1',
      title: 'Imported Pasta',
      description: 'Tasty',
      servings: 4,
      prepTimeMin: 10,
      cookTimeMin: 20,
      ingredients: [],
      instructions: [],
      tags: [],
      tagIds: [],
      imageUrl: null,
      sourceUrl: null,
      status: 'idea',
      createdVia: 'url',
      isContentLocked: true,
    } as never);
    await renderWithProviders(
      <Routes>
        <Route
          path="/import/review/:recipeId"
          element={<ImportReviewPage />}
        />
      </Routes>,
      {route: '/import/review/recipe-uuid-1'},
    );
    expect(
      await screen.findByText(/imported recipe \(v1\)/i),
    ).toBeInTheDocument();
  });

  test('starts import edits and navigates to edit version', async () => {
    await renderWithProviders(
      <Routes>
        <Route
          path="/import/review/:recipeId"
          element={<ImportReviewPage />}
        />
        <Route
          path="/recipes/:recipeId/versions/:versionId/edit"
          element={<div>Editing draft</div>}
        />
      </Routes>,
      {route: '/import/review/recipe-uuid-1'},
    );
    await waitFor(() => {
      expect(screen.getByText('Imported Pasta')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', {name: 'Make edits'}));
    await waitFor(() => {
      expect(mockStartImportEdits).toHaveBeenCalledWith('recipe-uuid-1');
    });
    expect(await screen.findByText('Editing draft')).toBeInTheDocument();
  });
});
