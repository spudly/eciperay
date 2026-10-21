import {fireEvent, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  recipeDetailToInput,
  recipeVersionDetailToInput,
  revertVersionScalar,
  uploadRecipeImage,
  validateRecipeImageFile,
} from '@eciperay/client';
import type {RecipeInput} from '@eciperay/types';

import {eciperay} from '../../lib/api.js';
import {
  makeRecipeDetail,
  makeRecipeVersionDetail,
  VERSION_ID,
} from '../../test/fixtures/recipe.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {RecipeForm} from './RecipeForm.js';

const actualClient = vi.hoisted(() =>
  vi.importActual<typeof import('@eciperay/client')>('@eciperay/client'),
);

vi.mock('../../lib/api.js', () => ({
  eciperay: {ai: {generateImage: vi.fn(), generateDescription: vi.fn()}},
}));

vi.mock('@eciperay/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@eciperay/client')>();
  return {
    ...actual,
    uploadRecipeImage: vi.fn(),
    validateRecipeImageFile: vi.fn(actual.validateRecipeImageFile),
    revertVersionScalar: vi.fn(actual.revertVersionScalar),
  };
});

const mockUploadRecipeImage = vi.mocked(uploadRecipeImage);
const mockValidateRecipeImageFile = vi.mocked(validateRecipeImageFile);
const mockRevertVersionScalar = vi.mocked(revertVersionScalar);
const mockGenerateImage = vi.mocked(eciperay.ai.generateImage);
const mockGenerateDescription = vi.mocked(eciperay.ai.generateDescription);
const imageGenerateButton = () =>
  screen.getByRole('button', {name: 'Generate image with AI'});
const descriptionGenerateButton = () =>
  screen.getByRole('button', {name: 'Generate description with AI'});

type OnSubmit = (input: RecipeInput, pendingImage?: File) => Promise<void>;

const mockOnSubmit = () => vi.fn<OnSubmit>().mockResolvedValue();

describe('RecipeForm', () => {
  beforeEach(async () => {
    const actual = await actualClient;
    mockRevertVersionScalar.mockReset();
    mockRevertVersionScalar.mockImplementation(actual.revertVersionScalar);
    mockUploadRecipeImage.mockReset();
    mockUploadRecipeImage.mockResolvedValue('https://cdn.example/recipe.png');
    mockGenerateImage.mockReset();
    mockGenerateImage.mockResolvedValue({
      imageBase64: btoa('pixels'),
      contentType: 'image/png',
    });
    mockGenerateDescription.mockReset();
    mockGenerateDescription.mockResolvedValue({
      description: 'A fresh AI-written description.',
    });
    mockValidateRecipeImageFile.mockReset();
    mockValidateRecipeImageFile.mockImplementation(file => {
      if (
        !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(
          file.type,
        )
      ) {
        throw new Error('Please choose a JPEG, PNG, GIF, or WebP image');
      }
    });
  });
  test('gives every scalar field the shared field background', async () => {
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={mockOnSubmit()}
      />,
    );

    for (const label of [
      'Title',
      'Description',
      'Servings',
      'Prep (min)',
      'Cook (min)',
      'Source URL',
    ]) {
      expect(screen.getByLabelText(label).className).toContain('bg-field');
    }
  });

  test('submits recipe input', async () => {
    const onSubmit = mockOnSubmit();
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

  test('initializes ingredients sorted by sort order', async () => {
    const detail = makeRecipeDetail({
      ingredients: [
        {
          id: 'i-3',
          recipeVersionId: VERSION_ID,
          sortOrder: 2,
          name: 'Salt',
          quantity: 1,
          unit: 'tsp',
          notes: null,
          isOptional: false,
        },
        {
          id: 'i-1',
          recipeVersionId: VERSION_ID,
          sortOrder: 0,
          name: 'Flour',
          quantity: 2,
          unit: 'cups',
          notes: null,
          isOptional: false,
        },
        {
          id: 'i-2',
          recipeVersionId: VERSION_ID,
          sortOrder: 1,
          name: 'Sugar',
          quantity: 1,
          unit: 'cup',
          notes: null,
          isOptional: false,
        },
      ],
    });
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(detail)}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    const nameInputs = screen.getAllByPlaceholderText('Name');
    expect(nameInputs.map(input => (input as HTMLInputElement).value)).toEqual([
      'Flour',
      'Sugar',
      'Salt',
    ]);
  });

  test('renders drag handles for reordering ingredients and instructions', async () => {
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', {name: 'Reorder ingredient 1'}),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: 'Reorder step 1'}),
    ).toBeInTheDocument();
  });

  test('initializes instructions sorted by step number', async () => {
    const detail = makeRecipeDetail({
      instructions: [
        {
          id: 'ins-3',
          recipeVersionId: VERSION_ID,
          stepNumber: 3,
          body: 'Serve',
          estimatedDurationMin: null,
        },
        {
          id: 'ins-1',
          recipeVersionId: VERSION_ID,
          stepNumber: 1,
          body: 'Prep',
          estimatedDurationMin: null,
        },
        {
          id: 'ins-2',
          recipeVersionId: VERSION_ID,
          stepNumber: 2,
          body: 'Cook',
          estimatedDurationMin: null,
        },
      ],
    });
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(detail)}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    const instructionAreas = screen
      .getAllByRole('textbox')
      .filter(el => (el as HTMLTextAreaElement).rows === 2);
    expect(
      instructionAreas.map(area => (area as HTMLTextAreaElement).value),
    ).toEqual(['Prep', 'Cook', 'Serve']);
  });

  test('adds and removes ingredients and instructions', async () => {
    const onSubmit = mockOnSubmit();
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
    const onSubmit = mockOnSubmit();
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

  test('uploads immediately when recipeId is provided', async () => {
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    await userEvent.upload(screen.getByLabelText('Browse images'), file);
    await waitFor(() => {
      expect(mockUploadRecipeImage).toHaveBeenCalledWith(
        expect.anything(),
        file,
        'user-1',
        'recipe-uuid-1',
      );
    });
    expect(screen.getByAltText('Recipe preview').getAttribute('src')).toMatch(
      /^https:\/\/cdn\.example\/recipe\.png\?v=\d+$/,
    );
  });

  test('updates the preview cache key when re-uploading to the same URL', async () => {
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    await userEvent.upload(screen.getByLabelText('Browse images'), file);
    await waitFor(() => {
      expect(screen.getByAltText('Recipe preview').getAttribute('src')).toMatch(
        /^https:\/\/cdn\.example\/recipe\.png\?v=\d+$/,
      );
    });
    const firstSrc = screen.getByAltText('Recipe preview').getAttribute('src');
    await userEvent.click(screen.getByText('Remove image'));
    await userEvent.upload(screen.getByLabelText('Browse images'), file);
    await waitFor(() => {
      const secondSrc = screen
        .getByAltText('Recipe preview')
        .getAttribute('src');
      expect(secondSrc).toMatch(/^https:\/\/cdn\.example\/recipe\.png\?v=\d+$/);
      expect(secondSrc).not.toBe(firstSrc);
    });
  });

  test('defers image upload on create until submit', async () => {
    const onSubmit = mockOnSubmit();
    await renderWithProviders(
      <RecipeForm
        initial={{
          title: 'New Recipe',
          servings: 4,
          ingredients: [],
          instructions: [],
          tagIds: [],
        }}
        submitLabel="Create"
        onSubmit={onSubmit}
      />,
    );
    await userEvent.type(screen.getAllByPlaceholderText('Name')[0]!, 'Flour');
    const instructionArea = screen
      .getAllByRole('textbox')
      .find(el => (el as HTMLTextAreaElement).rows === 2)!;
    await userEvent.type(instructionArea, 'Mix');
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    await userEvent.upload(screen.getByLabelText('Browse images'), file);
    expect(mockUploadRecipeImage).not.toHaveBeenCalled();
    expect(screen.getByAltText('Recipe preview')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Create'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(onSubmit.mock.calls[0]?.[0]?.imageUrl).toBeNull();
    expect(onSubmit.mock.calls[0]?.[1]).toBe(file);
  });

  test('accepts a pasted image anywhere on the form', async () => {
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    fireEvent.paste(screen.getByLabelText('Recipe image drop zone'), {
      clipboardData: {files: [file], items: []},
    });
    await waitFor(() => {
      expect(mockUploadRecipeImage).toHaveBeenCalledWith(
        expect.anything(),
        file,
        'user-1',
        'recipe-uuid-1',
      );
    });
  });

  test('removes a selected image', async () => {
    const revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Create"
        onSubmit={vi.fn()}
      />,
    );
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    await userEvent.upload(screen.getByLabelText('Browse images'), file);
    expect(screen.getByAltText('Recipe preview')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Remove image'));
    expect(screen.queryByAltText('Recipe preview')).not.toBeInTheDocument();
    expect(revokeObjectURL).toHaveBeenCalled();
    revokeObjectURL.mockRestore();
  });

  test('requires sign-in before uploading an image', async () => {
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
      {withAuth: false},
    );
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    await userEvent.upload(screen.getByLabelText('Browse images'), file);
    expect(
      await screen.findByText('Sign in to upload images'),
    ).toBeInTheDocument();
  });

  test('shows a validation error for unsupported image types', async () => {
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    const file = new File(['pixels'], 'recipe.txt', {type: 'text/plain'});
    fireEvent.change(screen.getByLabelText('Browse images'), {
      target: {files: [file]},
    });
    expect(
      await screen.findByText('Please choose a JPEG, PNG, GIF, or WebP image'),
    ).toBeInTheDocument();
  });

  test('shows a generic validation error for non-Error throws', async () => {
    mockValidateRecipeImageFile.mockImplementationOnce(() => {
      /* eslint-disable-next-line @typescript-eslint/only-throw-error -- coverage for non-Error validation failures */
      throw 'bad';
    });
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    fireEvent.change(screen.getByLabelText('Browse images'), {
      target: {files: [file]},
    });
    expect(await screen.findByText('Failed to read image')).toBeInTheDocument();
  });

  test('shows an upload error when storage fails', async () => {
    mockUploadRecipeImage.mockRejectedValueOnce(new Error('Upload failed'));
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    await userEvent.upload(screen.getByLabelText('Browse images'), file);
    expect(await screen.findByText('Upload failed')).toBeInTheDocument();
  });

  test('shows a generic upload error for non-Error throws', async () => {
    mockUploadRecipeImage.mockRejectedValueOnce('bad');
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    await userEvent.upload(screen.getByLabelText('Browse images'), file);
    expect(
      await screen.findByText('Failed to upload image'),
    ).toBeInTheDocument();
  });

  test('ignores image paste events that start in text fields', async () => {
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    fireEvent.paste(screen.getByLabelText('Title'), {
      clipboardData: {files: [file], items: []},
    });
    expect(mockUploadRecipeImage).not.toHaveBeenCalled();
  });

  test('ignores paste events without an image file on the form', async () => {
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.paste(screen.getByLabelText('Recipe image drop zone'), {
      clipboardData: {files: [], items: []},
    });
    expect(mockUploadRecipeImage).not.toHaveBeenCalled();
  });

  test('generates an image with AI and uploads it when editing', async () => {
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    await userEvent.click(imageGenerateButton());
    await waitFor(() => {
      expect(mockGenerateImage).toHaveBeenCalledWith({
        title: 'Test Recipe',
        description: 'A test recipe',
        ingredients: [
          {name: 'Flour', quantity: 2, unit: 'cups'},
          {name: 'Salt', quantity: null, unit: null},
        ],
        instructions: ['Mix dry ingredients', 'Bake at 350°F'],
      });
    });
    await waitFor(() => {
      expect(mockUploadRecipeImage).toHaveBeenCalled();
    });
  });

  test('defers AI-generated images on create until submit', async () => {
    const onSubmit = mockOnSubmit();
    await renderWithProviders(
      <RecipeForm
        initial={{
          title: 'New Recipe',
          servings: 4,
          ingredients: [],
          instructions: [],
          tagIds: [],
        }}
        submitLabel="Create"
        onSubmit={onSubmit}
      />,
    );
    await userEvent.click(imageGenerateButton());
    await waitFor(() => {
      expect(mockGenerateImage).toHaveBeenCalled();
    });
    expect(mockUploadRecipeImage).not.toHaveBeenCalled();
    expect(screen.getByAltText('Recipe preview')).toBeInTheDocument();
  });

  test('requires a title before generating an image', async () => {
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
    expect(imageGenerateButton()).toBeDisabled();
    expect(descriptionGenerateButton()).toBeDisabled();
    await userEvent.click(imageGenerateButton());
    expect(mockGenerateImage).not.toHaveBeenCalled();
  });

  test('requires sign-in before generating an image', async () => {
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
      {withAuth: false},
    );
    await userEvent.click(imageGenerateButton());
    expect(
      await screen.findByText('Sign in to generate images'),
    ).toBeInTheDocument();
  });

  test('uses a jpg filename for jpeg image content types', async () => {
    mockGenerateImage.mockResolvedValueOnce({
      imageBase64: btoa('pixels'),
      contentType: 'image/jpeg',
    });
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    await userEvent.click(imageGenerateButton());
    await waitFor(() => {
      expect(mockUploadRecipeImage).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({name: 'recipe.jpg', type: 'image/jpeg'}),
        'user-1',
        'recipe-uuid-1',
      );
    });
  });

  test('shows a generation error when AI image creation fails', async () => {
    mockGenerateImage.mockRejectedValueOnce(new Error('OpenAI unavailable'));
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    await userEvent.click(imageGenerateButton());
    expect(await screen.findByText('OpenAI unavailable')).toBeInTheDocument();
  });

  test('shows a generic generation error for non-Error throws', async () => {
    mockGenerateImage.mockRejectedValueOnce('bad');
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    await userEvent.click(imageGenerateButton());
    expect(
      await screen.findByText('Failed to generate image'),
    ).toBeInTheDocument();
  });

  test('generates a description from recipe details', async () => {
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    await userEvent.click(descriptionGenerateButton());
    await waitFor(() => {
      expect(mockGenerateDescription).toHaveBeenCalledWith({
        title: 'Test Recipe',
        ingredients: ['Flour', 'Salt'],
        instructions: ['Mix dry ingredients', 'Bake at 350°F'],
        prepTimeMin: 15,
        cookTimeMin: 30,
      });
    });
    expect(
      screen.getByDisplayValue('A fresh AI-written description.'),
    ).toBeInTheDocument();
  });

  test('sends null timing values when prep and cook are empty', async () => {
    await renderWithProviders(
      <RecipeForm
        initial={{
          title: 'New Recipe',
          servings: 4,
          ingredients: [
            {
              sortOrder: 0,
              name: 'Flour',
              quantity: null,
              unit: null,
              notes: null,
              isOptional: false,
            },
          ],
          instructions: [{stepNumber: 1, body: 'Mix'}],
          tagIds: [],
        }}
        submitLabel="Create"
        onSubmit={vi.fn()}
      />,
    );
    await userEvent.click(descriptionGenerateButton());
    await waitFor(() => {
      expect(mockGenerateDescription).toHaveBeenCalledWith({
        title: 'New Recipe',
        ingredients: ['Flour'],
        instructions: ['Mix'],
        prepTimeMin: null,
        cookTimeMin: null,
      });
    });
  });

  test('requires sign-in before generating a description', async () => {
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
      {withAuth: false},
    );
    await userEvent.click(descriptionGenerateButton());
    expect(
      await screen.findByText('Sign in to generate descriptions'),
    ).toBeInTheDocument();
  });

  test('shows a generation error when AI description creation fails', async () => {
    mockGenerateDescription.mockRejectedValueOnce(
      new Error('Claude unavailable'),
    );
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    await userEvent.click(descriptionGenerateButton());
    expect(await screen.findByText('Claude unavailable')).toBeInTheDocument();
  });

  test('shows a generic description generation error for non-Error throws', async () => {
    mockGenerateDescription.mockRejectedValueOnce('bad');
    await renderWithProviders(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );
    await userEvent.click(descriptionGenerateButton());
    expect(
      await screen.findByText('Failed to generate description'),
    ).toBeInTheDocument();
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

  test('shows parent version diff UI and reverts changed fields', async () => {
    const parentVersion = makeRecipeVersionDetail({
      title: 'Original Title',
      description: 'Original description',
      servings: 4,
      prepTimeMin: 10,
      cookTimeMin: 20,
      sourceUrl: 'https://example.com/source',
      tags: [
        {
          id: 'tag-1',
          userId: null,
          name: 'Dinner',
          color: '#6366f1',
          isPreset: false,
        },
      ],
    });
    const initial = {
      ...recipeVersionDetailToInput(parentVersion),
      title: 'Changed Title',
      description: 'Changed description',
      servings: 6,
      prepTimeMin: 5,
      cookTimeMin: 25,
      sourceUrl: 'https://other.com',
      tagIds: ['tag-2'],
      ingredients: [
        {
          sortOrder: 0,
          name: 'Changed flour',
          quantity: 2,
          unit: 'cups',
          notes: null,
          isOptional: false,
        },
      ],
      instructions: [{stepNumber: 1, body: 'Changed step'}],
    };

    await renderWithProviders(
      <RecipeForm
        initial={initial}
        parentVersion={parentVersion}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Ingredients changed from parent version/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Instructions changed from parent version/),
    ).toBeInTheDocument();
    expect(screen.getByText('Revert to: Dinner')).toBeInTheDocument();

    const revertNearLabel = (label: string, hint?: string) => {
      const labelEl = screen.getByText(label, {selector: 'label'});
      const header = labelEl.parentElement!;
      const name = hint ? `Revert to: ${hint}` : /^Revert to:/;
      return within(header).getByRole('button', {name});
    };

    await userEvent.click(revertNearLabel('Title', 'Original Title'));
    expect(screen.getByLabelText('Title')).toHaveValue('Original Title');
    await userEvent.click(revertNearLabel('Description'));
    expect(screen.getByLabelText('Description')).toHaveValue(
      'Original description',
    );
    await userEvent.click(revertNearLabel('Servings'));
    expect(screen.getByLabelText('Servings')).toHaveValue(4);
    await userEvent.click(revertNearLabel('Prep (min)'));
    expect(screen.getByLabelText('Prep (min)')).toHaveValue(10);
    await userEvent.click(revertNearLabel('Cook (min)'));
    expect(screen.getByLabelText('Cook (min)')).toHaveValue(20);
    await userEvent.click(revertNearLabel('Source URL'));
    expect(screen.getByLabelText('Source URL')).toHaveValue(
      'https://example.com/source',
    );

    await userEvent.click(screen.getByText('Revert to: Dinner'));
    await waitFor(() => {
      expect(screen.queryByText('Revert to: Dinner')).not.toBeInTheDocument();
    });

    const ingredientRevert = screen
      .getByText(/Ingredients changed from parent version/)
      .closest('div')
      ?.querySelector('button');
    await userEvent.click(ingredientRevert!);
    expect(screen.getAllByPlaceholderText('Name')[0]).toHaveValue('Flour');

    const instructionRevert = screen
      .getByText(/Instructions changed from parent version/)
      .closest('div')
      ?.querySelector('button');
    await userEvent.click(instructionRevert!);
    const instructionArea = screen
      .getAllByRole('textbox')
      .find(el => (el as HTMLTextAreaElement).rows === 2)!;
    expect(instructionArea).toHaveValue('Mix dry ingredients');
  });

  test('reverts changed image URL and clears a pending upload', async () => {
    const parentVersion = makeRecipeVersionDetail({
      imageUrl: 'https://example.com/parent.jpg',
    });
    const initial = {
      ...recipeVersionDetailToInput(parentVersion),
      imageUrl: 'https://example.com/changed.jpg',
    };

    await renderWithProviders(
      <RecipeForm
        initial={initial}
        parentVersion={parentVersion}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );

    const file = new File(['pixels'], 'recipe.png', {type: 'image/png'});
    await userEvent.upload(screen.getByLabelText('Browse images'), file);
    expect(screen.getByAltText('Recipe preview')).toBeInTheDocument();

    const revertNearLabel = (label: string, hint?: string) => {
      const labelEl = screen.getByText(label);
      const header = labelEl.parentElement!;
      const name = hint ? `Revert to: ${hint}` : /^Revert to:/;
      return within(header).getByRole('button', {name});
    };

    await userEvent.click(revertNearLabel('Recipe image', 'parent.jpg'));
    expect(screen.getByAltText('Recipe preview')).toHaveAttribute(
      'src',
      'https://example.com/parent.jpg',
    );
  });

  test('reverts null parent prep and cook times to empty fields', async () => {
    const parentVersion = makeRecipeVersionDetail({
      prepTimeMin: null,
      cookTimeMin: null,
    });
    const initial = {
      ...recipeVersionDetailToInput(parentVersion),
      prepTimeMin: 15,
      cookTimeMin: 30,
    };

    await renderWithProviders(
      <RecipeForm
        initial={initial}
        parentVersion={parentVersion}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );

    const revertNearLabel = (label: string, hint?: string) => {
      const labelEl = screen.getByText(label, {selector: 'label'});
      const header = labelEl.parentElement!;
      const name = hint ? `Revert to: ${hint}` : /^Revert to:/;
      return within(header).getByRole('button', {name});
    };

    await userEvent.click(revertNearLabel('Prep (min)', '(none)'));
    expect(screen.getByLabelText('Prep (min)')).toHaveValue(null);
    await userEvent.click(revertNearLabel('Cook (min)', '(none)'));
    expect(screen.getByLabelText('Cook (min)')).toHaveValue(null);
  });

  test('reverts null description, image URL, and source URL from parent', async () => {
    const parentVersion = makeRecipeVersionDetail({
      description: null,
      imageUrl: null,
      sourceUrl: null,
    });
    const initial = {
      ...recipeVersionDetailToInput(parentVersion),
      description: 'Changed description',
      imageUrl: 'https://example.com/changed.jpg',
      sourceUrl: 'https://example.com/changed',
    };

    await renderWithProviders(
      <RecipeForm
        initial={initial}
        parentVersion={parentVersion}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );

    const revertNearLabel = (label: string, hint?: string) => {
      const labelEl = screen.getByText(label, {selector: 'label'});
      const header = labelEl.parentElement!;
      const name = hint ? `Revert to: ${hint}` : /^Revert to:/;
      return within(header).getByRole('button', {name});
    };

    await userEvent.click(revertNearLabel('Description', '(empty)'));
    expect(screen.getByLabelText('Description')).toHaveValue('');
    await userEvent.click(
      within(screen.getByText('Recipe image').parentElement!).getByRole(
        'button',
        {name: 'Revert to: (no image)'},
      ),
    );
    expect(screen.queryByAltText('Recipe preview')).not.toBeInTheDocument();
    await userEvent.click(revertNearLabel('Source URL', '(none)'));
    expect(screen.getByLabelText('Source URL')).toHaveValue('');
  });

  test('uses fallback values when reverting null title and servings', async () => {
    const actual = await actualClient;
    const parentVersion = makeRecipeVersionDetail();
    const initial = {
      ...recipeVersionDetailToInput(parentVersion),
      title: 'Changed title',
      servings: 8,
    };
    mockRevertVersionScalar.mockImplementation((parent, field) => {
      if (field === 'title' || field === 'servings') {
        return null;
      }
      return actual.revertVersionScalar(parent, field);
    });

    await renderWithProviders(
      <RecipeForm
        initial={initial}
        parentVersion={parentVersion}
        submitLabel="Save"
        onSubmit={vi.fn()}
      />,
    );

    const revertNearLabel = (label: string, hint?: string) => {
      const labelEl = screen.getByText(label, {selector: 'label'});
      const header = labelEl.parentElement!;
      const name = hint ? `Revert to: ${hint}` : /^Revert to:/;
      return within(header).getByRole('button', {name});
    };

    await userEvent.click(revertNearLabel('Title'));
    expect(screen.getByLabelText('Title')).toHaveValue('');
    await userEvent.click(revertNearLabel('Servings'));
    expect(screen.getByLabelText('Servings')).toHaveValue(1);
  });
});
