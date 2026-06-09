import {fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  recipeDetailToInput,
  uploadRecipeImage,
  validateRecipeImageFile,
} from '@recipoo/client';
import type {RecipeInput} from '@recipoo/types';

import {recipoo} from '../../lib/api.js';
import {makeRecipeDetail} from '../../test/fixtures/recipe.js';
import {renderWithProviders} from '../../test/testUtils.js';

import {RecipeForm} from './RecipeForm.js';

vi.mock('../../lib/api.js', () => ({recipoo: {ai: {generateImage: vi.fn()}}}));

vi.mock('@recipoo/client', async importOriginal => {
  const actual = await importOriginal<typeof import('@recipoo/client')>();
  return {
    ...actual,
    uploadRecipeImage: vi.fn(),
    validateRecipeImageFile: vi.fn(actual.validateRecipeImageFile),
  };
});

const mockUploadRecipeImage = vi.mocked(uploadRecipeImage);
const mockValidateRecipeImageFile = vi.mocked(validateRecipeImageFile);
const mockGenerateImage = vi.mocked(recipoo.ai.generateImage);

type OnSubmit = (input: RecipeInput, pendingImage?: File) => Promise<void>;

const mockOnSubmit = () => vi.fn<OnSubmit>().mockResolvedValue();

describe('RecipeForm', () => {
  beforeEach(() => {
    mockUploadRecipeImage.mockReset();
    mockUploadRecipeImage.mockResolvedValue('https://cdn.example/recipe.png');
    mockGenerateImage.mockReset();
    mockGenerateImage.mockResolvedValue({
      imageBase64: btoa('pixels'),
      contentType: 'image/png',
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
    expect(screen.getByAltText('Recipe preview')).toHaveAttribute(
      'src',
      'https://cdn.example/recipe.png',
    );
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
    await userEvent.click(screen.getByText('Generate with AI'));
    await waitFor(() => {
      expect(mockGenerateImage).toHaveBeenCalledWith({
        title: 'Test Recipe',
        description: 'A test recipe',
        ingredients: ['Flour', 'Salt'],
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
    await userEvent.click(screen.getByText('Generate with AI'));
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
    expect(screen.getByText('Generate with AI')).toBeDisabled();
    await userEvent.click(screen.getByText('Generate with AI'));
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
    await userEvent.click(screen.getByText('Generate with AI'));
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
    await userEvent.click(screen.getByText('Generate with AI'));
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
    await userEvent.click(screen.getByText('Generate with AI'));
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
    await userEvent.click(screen.getByText('Generate with AI'));
    expect(
      await screen.findByText('Failed to generate image'),
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
});
