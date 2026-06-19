import {
  queryKeys,
  recipeDetailToInput,
  recipeVersionDetailToInput,
  revertVersionScalar,
  uploadRecipeImageFromBase64,
  useAuth,
} from '@eciperay/client';
import type {RecipeInput} from '@eciperay/types';
import React from 'react';
import {act, fireEvent, waitFor} from '@testing-library/react-native';

import {
  makeRecipeDetail,
  makeRecipeVersionDetail,
} from '../../__tests__/fixtures/recipe';
import {makeQueryClient, renderWithProviders} from '../../__tests__/testUtils';
import {api} from '../../lib/api';

import {RecipeForm} from './RecipeForm';

jest.mock('../../lib/api', () => ({
  api: {
    tags: {list: jest.fn()},
    ai: {generateImage: jest.fn(), generateDescription: jest.fn()},
  },
}));
jest.mock('../../lib/supabase', () => ({supabase: {}}));
jest.mock('react-native-image-picker', () => ({launchImageLibrary: jest.fn()}));
jest.mock('../../lib/androidPermissions', () => ({
  confirmPhotoLibraryAccess: jest.fn().mockResolvedValue(true),
}));

jest.mock('@eciperay/client', () => {
  const actual = jest.requireActual('@eciperay/client');
  return {
    ...actual,
    useAuth: jest.fn(() => ({
      session: {user: {id: 'user-1'}},
      isLoading: false,
    })),
    uploadRecipeImageFromBase64: jest.fn(),
    revertVersionScalar: jest.fn(actual.revertVersionScalar),
  };
});

const mockListTags = api.tags.list as jest.Mock;
const mockGenerateImage = api.ai.generateImage as jest.Mock;
const mockGenerateDescription = api.ai.generateDescription as jest.Mock;
const mockUploadRecipeImageFromBase64 =
  uploadRecipeImageFromBase64 as jest.Mock;
const mockRevertVersionScalar = revertVersionScalar as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;

type OnSubmit = (
  input: RecipeInput,
  pendingImage?: {base64: string; contentType: string},
) => Promise<void>;

const mockOnSubmit = (): jest.MockedFunction<OnSubmit> =>
  jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve(),
    ) as jest.MockedFunction<OnSubmit>;

const renderForm = async (ui: React.ReactElement) => {
  const queryClient = makeQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => mockListTags(),
  });
  return renderWithProviders(ui, queryClient);
};

describe('RecipeForm', () => {
  beforeEach(() => {
    const actual = jest.requireActual('@eciperay/client');
    mockRevertVersionScalar.mockImplementation(actual.revertVersionScalar);
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'user-1'}},
      isLoading: false,
    });
    mockListTags.mockResolvedValue([]);
    mockUseAuth.mockReturnValue({
      session: {user: {id: 'user-1'}},
      isLoading: false,
    });
    mockGenerateImage.mockReset();
    mockGenerateImage.mockResolvedValue({
      imageBase64: btoa('pixels'),
      contentType: 'image/png',
    });
    mockGenerateDescription.mockReset();
    mockGenerateDescription.mockResolvedValue({
      description: 'A fresh AI-written description.',
    });
    mockUploadRecipeImageFromBase64.mockReset();
    mockUploadRecipeImageFromBase64.mockResolvedValue(
      'https://cdn.example/recipe.png',
    );
  });

  test('renders drag handles for reordering ingredients and instructions', async () => {
    const {getByLabelText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={mockOnSubmit()}
      />,
    );

    expect(getByLabelText('Reorder ingredient 1')).toBeTruthy();
    expect(getByLabelText('Reorder step 1')).toBeTruthy();
  });

  test('reorders ingredients before submit', async () => {
    const onSubmit = mockOnSubmit();
    const {getByLabelText, getByText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    );

    await act(async () => {
      fireEvent.press(getByLabelText('Mock reorder i-2'));
    });
    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.ingredients.map(ingredient => ingredient.name)).toEqual([
      'Salt',
      'Flour',
    ]);
    expect(
      submitted.ingredients.map(ingredient => ingredient.sortOrder),
    ).toEqual([0, 1]);
  });

  test('reorders instructions before submit', async () => {
    const onSubmit = mockOnSubmit();
    const {getByLabelText, getByText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    );

    fireEvent.press(getByLabelText('Mock reorder ins-2'));
    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.instructions.map(instruction => instruction.body)).toEqual(
      ['Bake at 350°F', 'Mix dry ingredients'],
    );
    expect(
      submitted.instructions.map(instruction => instruction.stepNumber),
    ).toEqual([1, 2]);
  });

  test('submits recipe input', async () => {
    const onSubmit = mockOnSubmit();
    const {getByText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.press(getByText('Save'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  test('shows generic error on non-Error failure', async () => {
    const onSubmit = jest.fn().mockRejectedValue('nope');
    const {getByText, findByText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.press(getByText('Save'));
    expect(await findByText('Failed to save')).toBeTruthy();
  });

  test('shows error on failed submit', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('Save failed'));
    const {getByText, findByText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.press(getByText('Save'));
    expect(await findByText('Save failed')).toBeTruthy();
  });

  test('adds and removes ingredients and instructions', async () => {
    const onSubmit = mockOnSubmit();
    const {getAllByText, getByText, getAllByPlaceholderText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.changeText(getAllByPlaceholderText('Qty')[0], '3');
    fireEvent.changeText(getAllByPlaceholderText('Qty')[0], '');
    fireEvent.changeText(getAllByPlaceholderText('Unit')[0], 'cups');
    fireEvent.changeText(getAllByPlaceholderText('Unit')[0], '');
    fireEvent.press(getAllByText('+ Add')[0]);
    fireEvent.press(getAllByText('Remove')[0]);
    fireEvent.press(getAllByText('+ Add')[1]);
    fireEvent.press(getAllByText('Remove').at(-1)!);
    fireEvent.press(getByText('Save'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  test('updates instruction body text', async () => {
    const {getByDisplayValue} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    const step = getByDisplayValue('Mix dry ingredients');
    fireEvent.changeText(step, 'Updated step');
    expect(step.props.value).toBe('Updated step');
  });

  test('submits string quantity as a number', async () => {
    const onSubmit = mockOnSubmit();
    const {getByText, getAllByPlaceholderText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.changeText(getAllByPlaceholderText('Qty')[0], '1.5');
    fireEvent.press(getByText('Save'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(onSubmit.mock.calls[0][0].ingredients[0].quantity).toBe(1.5);
  });

  test('renders null quantity ingredient as empty qty field', async () => {
    const recipe = recipeDetailToInput(
      makeRecipeDetail({
        ingredients: [
          {
            id: 'i-salt',
            recipeVersionId: 'version-uuid-1',
            sortOrder: 0,
            name: 'Salt',
            quantity: null,
            unit: null,
            notes: null,
            isOptional: false,
          },
        ],
      }),
    );
    const {getAllByPlaceholderText} = await renderForm(
      <RecipeForm
        initial={recipe}
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    expect(getAllByPlaceholderText('Qty')[0].props.value).toBe('');
  });

  test('renders empty initial state and updates metadata fields', async () => {
    const {getAllByDisplayValue} = await renderForm(
      <RecipeForm
        initial={{
          title: '',
          servings: 4,
          ingredients: [],
          instructions: [],
          tagIds: [],
        }}
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    const titleInput = getAllByDisplayValue('')[0];
    fireEvent.changeText(titleInput, 'New Title');
    fireEvent.changeText(getAllByDisplayValue('4')[0], '6');
    expect(titleInput.props.value).toBe('New Title');
  });

  test('generates a description with AI', async () => {
    const {getByLabelText, findByDisplayValue} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Generate description with AI'));
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
      await findByDisplayValue('A fresh AI-written description.'),
    ).toBeTruthy();
  });

  test('generates an image with AI and uploads it when editing', async () => {
    const {getByLabelText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Generate image with AI'));
    await waitFor(() => {
      expect(mockGenerateImage).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockUploadRecipeImageFromBase64).toHaveBeenCalled();
    });
  });

  test('defers AI-generated images on create until submit', async () => {
    const onSubmit = mockOnSubmit();
    const {getByLabelText} = await renderForm(
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
    fireEvent.press(getByLabelText('Generate image with AI'));
    await waitFor(() => {
      expect(mockGenerateImage).toHaveBeenCalled();
    });
    expect(mockUploadRecipeImageFromBase64).not.toHaveBeenCalled();
    expect(getByLabelText('Recipe preview')).toBeTruthy();
  });

  test('requires a title before generating with AI', async () => {
    const {getByLabelText} = await renderForm(
      <RecipeForm
        initial={{
          title: '',
          servings: 4,
          ingredients: [],
          instructions: [],
          tagIds: [],
        }}
        submitLabel="Create"
        onSubmit={jest.fn()}
      />,
    );
    expect(
      getByLabelText('Generate image with AI').props.accessibilityState,
    ).toMatchObject({disabled: true});
    expect(
      getByLabelText('Generate description with AI').props.accessibilityState,
    ).toMatchObject({disabled: true});
  });

  test('requires sign-in before generating an image', async () => {
    mockUseAuth.mockReturnValue({session: null, isLoading: false});
    const {getByLabelText, findByText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Generate image with AI'));
    expect(await findByText('Sign in to generate images')).toBeTruthy();
  });

  test('shows description generation errors', async () => {
    mockGenerateDescription.mockRejectedValueOnce(
      new Error('OpenAI unavailable'),
    );
    const {getByLabelText, findByText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Generate description with AI'));
    expect(await findByText('OpenAI unavailable')).toBeTruthy();
  });

  test('shows generic description generation errors', async () => {
    mockGenerateDescription.mockRejectedValueOnce('service down');
    const {getByLabelText, findByText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(
          makeRecipeDetail({prepTimeMin: null, cookTimeMin: null}),
        )}
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Generate description with AI'));
    expect(await findByText('Failed to generate description')).toBeTruthy();
    expect(mockGenerateDescription).toHaveBeenCalledWith(
      expect.objectContaining({prepTimeMin: null, cookTimeMin: null}),
    );
  });

  test('shows image generation errors', async () => {
    mockGenerateImage.mockRejectedValueOnce(
      new Error('Image model unavailable'),
    );
    const {getByLabelText, findByText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Generate image with AI'));
    expect(await findByText('Image model unavailable')).toBeTruthy();
  });

  test('shows generic image generation errors', async () => {
    mockGenerateImage.mockRejectedValueOnce('model offline');
    const {getByLabelText, findByText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Generate image with AI'));
    expect(await findByText('Failed to generate image')).toBeTruthy();
  });

  test('removes the current image preview', async () => {
    const {getByText, queryByLabelText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(
          makeRecipeDetail({imageUrl: 'https://cdn.example/recipe.png'}),
        )}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    fireEvent.press(getByText('Remove image'));
    expect(queryByLabelText('Recipe preview')).toBeNull();
  });

  test('removes a generated image preview', async () => {
    const {getByLabelText, getByText, queryByLabelText} = await renderForm(
      <RecipeForm
        initial={{
          title: 'New Recipe',
          servings: 4,
          ingredients: [],
          instructions: [],
          tagIds: [],
        }}
        submitLabel="Create"
        onSubmit={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Generate image with AI'));
    await waitFor(() => {
      expect(mockGenerateImage).toHaveBeenCalled();
    });
    expect(getByLabelText('Recipe preview')).toBeTruthy();
    fireEvent.press(getByText('Remove image'));
    expect(queryByLabelText('Recipe preview')).toBeNull();
  });

  test('requires sign-in before generating a description', async () => {
    mockUseAuth.mockReturnValue({session: null, isLoading: false});
    const {getByLabelText, findByText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Generate description with AI'));
    expect(await findByText('Sign in to generate descriptions')).toBeTruthy();
  });

  test('shows upload errors when editing', async () => {
    mockUploadRecipeImageFromBase64.mockRejectedValueOnce(
      new Error('Upload failed'),
    );
    const {getByLabelText, findByText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Generate image with AI'));
    expect(await findByText('Upload failed')).toBeTruthy();
  });

  test('shows generic upload errors when editing', async () => {
    mockUploadRecipeImageFromBase64.mockRejectedValueOnce('network error');
    const {getByLabelText, findByText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Generate image with AI'));
    expect(await findByText('Failed to upload image')).toBeTruthy();
  });

  test('requires sign-in before uploading an image', async () => {
    mockUseAuth.mockReturnValue({session: null, isLoading: false});
    const {getByLabelText, findByText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        recipeId="recipe-uuid-1"
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    const {launchImageLibrary} = require('react-native-image-picker');
    launchImageLibrary.mockResolvedValue({
      assets: [
        {
          uri: 'file://recipe.png',
          base64: btoa('pixels'),
          type: 'image/png',
          fileSize: 6,
        },
      ],
    });
    fireEvent.press(getByLabelText('Choose recipe image'));
    expect(await findByText('Sign in to upload images')).toBeTruthy();
  });

  test('shows image pick validation errors', async () => {
    const {launchImageLibrary} = require('react-native-image-picker');
    launchImageLibrary.mockResolvedValue({
      assets: [{uri: 'file://recipe.png', type: 'image/png'}],
    });
    const {getByLabelText, findByText} = await renderForm(
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save"
        onSubmit={jest.fn()}
      />,
    );
    fireEvent.press(getByLabelText('Choose recipe image'));
    expect(await findByText('Failed to read image')).toBeTruthy();
  });

  test('passes pending image to onSubmit when creating', async () => {
    const onSubmit = mockOnSubmit();
    const {getByLabelText, getByText} = await renderForm(
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
    fireEvent.press(getByLabelText('Generate image with AI'));
    await waitFor(() => {
      expect(mockGenerateImage).toHaveBeenCalled();
    });
    fireEvent.press(getByText('Create'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({title: 'New Recipe', imageUrl: null}),
        {base64: btoa('pixels'), contentType: 'image/png'},
      );
    });
  });

  test('shows parent version diff UI and reverts changed title', async () => {
    const parentVersion = makeRecipeVersionDetail({
      title: 'Original Title',
      description: 'Original description',
      servings: 4,
      prepTimeMin: 10,
      cookTimeMin: 20,
      sourceUrl: 'https://example.com/source',
      imageUrl: 'https://example.com/parent.jpg',
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
      imageUrl: 'https://example.com/changed.jpg',
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

    const {getByText, getByLabelText, queryByText, getAllByText} =
      await renderForm(
        <RecipeForm
          initial={initial}
          parentVersion={parentVersion}
          submitLabel="Save"
          onSubmit={mockOnSubmit()}
        />,
      );

    expect(getByText(/Ingredients changed from parent version/)).toBeTruthy();
    expect(getByText('Revert to: Dinner')).toBeTruthy();

    fireEvent.press(getByText('Revert to: Original Title'));
    expect(getByLabelText('Title')).toHaveProp('value', 'Original Title');
    fireEvent.press(getByText('Revert to: Original description'));
    fireEvent.press(getByText('Revert to: 4'));
    fireEvent.press(getByText('Revert to: 10 min'));
    fireEvent.press(getByText('Revert to: 20 min'));
    fireEvent.press(getByText('Revert to: parent.jpg'));
    fireEvent.press(getByText('Revert to: https://example.com/source'));

    fireEvent.press(getByText('Revert to: Dinner'));
    await waitFor(() => {
      expect(queryByText('Revert to: Dinner')).toBeNull();
    });

    const listRevertButtons = getAllByText('Revert');
    fireEvent.press(listRevertButtons[0]);
    fireEvent.press(listRevertButtons[1]);
  });

  test('uses fallback values when reverting null title and servings', async () => {
    mockRevertVersionScalar.mockImplementation((parent, field) => {
      if (
        field === 'title' ||
        field === 'servings' ||
        field === 'description' ||
        field === 'imageUrl' ||
        field === 'sourceUrl'
      ) {
        return null;
      }
      const actual = jest.requireActual('@eciperay/client');
      return actual.revertVersionScalar(parent, field);
    });
    const parentVersion = makeRecipeVersionDetail({
      description: null,
      prepTimeMin: null,
      cookTimeMin: null,
      imageUrl: 'https://example.com/parent.jpg',
      sourceUrl: 'https://example.com/source',
    });
    const {getByText, getByLabelText, getAllByText} = await renderForm(
      <RecipeForm
        initial={{
          ...recipeVersionDetailToInput(parentVersion),
          title: 'Changed title',
          description: 'Changed description',
          servings: 8,
          prepTimeMin: 15,
          cookTimeMin: 30,
          imageUrl: 'https://example.com/changed.jpg',
          sourceUrl: 'https://example.com/changed',
        }}
        parentVersion={parentVersion}
        submitLabel="Save"
        onSubmit={mockOnSubmit()}
      />,
    );

    fireEvent.press(getByText('Revert to: Test Recipe'));
    expect(getByLabelText('Title')).toHaveProp('value', '');
    fireEvent.press(getByText('Revert to: 4'));
    expect(getByLabelText('Servings')).toHaveProp('value', '1');
    fireEvent.press(getByText('Revert to: (empty)'));
    fireEvent.press(getByText('Revert to: parent.jpg'));
    fireEvent.press(getByText('Revert to: https://example.com/source'));
    fireEvent.press(getAllByText('Revert to: (none)')[0]);
    expect(getByLabelText('Prep (min)')).toHaveProp('value', '');
    fireEvent.press(getAllByText('Revert to: (none)')[0]);
    expect(getByLabelText('Cook (min)')).toHaveProp('value', '');
  });

  test('reverts null cook time to an empty field', async () => {
    const parentVersion = makeRecipeVersionDetail({
      prepTimeMin: 10,
      cookTimeMin: null,
    });
    const {getByText, getByLabelText} = await renderForm(
      <RecipeForm
        initial={{
          ...recipeVersionDetailToInput(parentVersion),
          cookTimeMin: 30,
        }}
        parentVersion={parentVersion}
        submitLabel="Save"
        onSubmit={mockOnSubmit()}
      />,
    );
    fireEvent.press(getByText('Revert to: (none)'));
    expect(getByLabelText('Cook (min)')).toHaveProp('value', '');
  });
});
