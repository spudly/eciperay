/* eslint-disable max-lines -- shared recipe form with dynamic ingredient/instruction lists */
import {
  uploadRecipeImage,
  useAuth,
  validateRecipeImageFile,
} from '@recipoo/client';
import type {
  IngredientInput,
  InstructionInput,
  RecipeInput,
} from '@recipoo/types';
import {useEffect, useState} from 'react';

import {
  getImageFileFromDataTransfer,
  shouldIgnoreImagePaste,
} from '../../lib/recipeImageInput.js';
import {recipoo} from '../../lib/api.js';
import {imageBase64ToFile} from '../../lib/imageBase64ToFile.js';
import {supabase} from '../../lib/supabase.js';

import {RecipeImageField} from './RecipeImageField.js';
import {TagPicker} from './TagPicker.js';

type Props = {
  initial: RecipeInput;
  recipeId?: string;
  submitLabel: string;
  onSubmit: (input: RecipeInput, pendingImage?: File) => Promise<void>;
};

type FormIngredient = Omit<IngredientInput, 'quantity'> & {
  quantity: number | string | null;
};

const emptyIngredient = (sortOrder: number): FormIngredient => ({
  sortOrder,
  name: '',
  quantity: null,
  unit: null,
  notes: null,
  isOptional: false,
});

const toQuantity = (value: number | string | null): number | null => {
  if (value === null) {
    return null;
  }
  return typeof value === 'number' ? value : Number(value);
};

const emptyInstruction = (stepNumber: number): InstructionInput => ({
  stepNumber,
  body: '',
});

export const RecipeForm = ({
  initial,
  recipeId,
  submitLabel,
  onSubmit,
}: Props) => {
  const {session} = useAuth();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? '');
  const [servings, setServings] = useState(initial.servings);
  const [prepTimeMin, setPrepTimeMin] = useState(initial.prepTimeMin ?? '');
  const [cookTimeMin, setCookTimeMin] = useState(initial.cookTimeMin ?? '');
  const [imageUrl, setImageUrl] = useState(initial.imageUrl ?? '');
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl ?? '');
  const [ingredients, setIngredients] = useState<FormIngredient[]>(
    initial.ingredients.length > 0 ? initial.ingredients : [emptyIngredient(0)],
  );
  const [instructions, setInstructions] = useState<InstructionInput[]>(
    initial.instructions.length > 0
      ? initial.instructions
      : [emptyInstruction(1)],
  );
  const [tagIds, setTagIds] = useState<string[]>(initial.tagIds);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageGenerating, setImageGenerating] = useState(false);

  const clearPendingImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPendingImageFile(null);
  };

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl],
  );

  const processImageFile = async (file: File) => {
    const userId = session?.user.id;
    if (!userId) {
      setImageError('Sign in to upload images');
      return;
    }
    setImageError(null);
    try {
      validateRecipeImageFile(file);
    } catch (error_) {
      setImageError(
        error_ instanceof Error ? error_.message : 'Failed to read image',
      );
      return;
    }

    if (recipeId) {
      setImageUploading(true);
      try {
        clearPendingImage();
        setImageUrl(await uploadRecipeImage(supabase, file, userId, recipeId));
      } catch (error_) {
        setImageError(
          error_ instanceof Error ? error_.message : 'Failed to upload image',
        );
      } finally {
        setImageUploading(false);
      }
      return;
    }

    clearPendingImage();
    setImageUrl('');
    setPendingImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleGenerateImage = async () => {
    const trimmedTitle = title.trim();
    /* c8 ignore next 4 -- generate button is disabled when title is empty */
    if (!trimmedTitle) {
      setImageError('Add a title before generating an image');
      return;
    }
    if (!session?.user.id) {
      setImageError('Sign in to generate images');
      return;
    }
    setImageError(null);
    setImageGenerating(true);
    try {
      const ingredientNames = ingredients
        .map(ingredient => ingredient.name.trim())
        .filter(Boolean);
      const {imageBase64, contentType} = await recipoo.ai.generateImage({
        title: trimmedTitle,
        description: description || null,
        ingredients: ingredientNames,
      });
      const extension = contentType === 'image/jpeg' ? 'jpg' : 'png';
      await processImageFile(
        imageBase64ToFile(imageBase64, contentType, `recipe.${extension}`),
      );
    } catch (error_) {
      setImageError(
        error_ instanceof Error ? error_.message : 'Failed to generate image',
      );
    } finally {
      setImageGenerating(false);
    }
  };

  const handleFormPaste = (e: React.ClipboardEvent) => {
    if (shouldIgnoreImagePaste(e.target)) {
      return;
    }
    const file = getImageFileFromDataTransfer(e.clipboardData);
    if (!file) {
      return;
    }
    e.preventDefault();
    void processImageFile(file);
  };

  const updateIngredient = (
    index: number,
    field: keyof IngredientInput,
    value: string | number | boolean | null,
  ) => {
    setIngredients(prev =>
      prev.map((ing, i) => (i === index ? {...ing, [field]: value} : ing)),
    );
  };

  const updateInstruction = (index: number, body: string) => {
    setInstructions(prev =>
      prev.map((ins, i) => (i === index ? {...ins, body} : ins)),
    );
  };

  const buildInput = (): RecipeInput => ({
    title,
    description: description || null,
    servings,
    prepTimeMin: prepTimeMin === '' ? null : Number(prepTimeMin),
    cookTimeMin: cookTimeMin === '' ? null : Number(cookTimeMin),
    imageUrl: pendingImageFile ? null : imageUrl || null,
    sourceUrl: sourceUrl || null,
    ingredients: ingredients.map((ing, i) => ({
      ...ing,
      sortOrder: i,
      quantity: toQuantity(ing.quantity),
    })),
    instructions: instructions.map((ins, i) => ({...ins, stepNumber: i + 1})),
    tagIds,
  });

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(buildInput(), pendingImageFile ?? undefined);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const imagePreview = previewUrl ?? imageUrl;

  return (
    <form
      onSubmit={e => {
        void handleSubmit(e);
      }}
      onPaste={handleFormPaste}
      className="space-y-6"
    >
      <div>
        <label
          htmlFor="title"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Title
        </label>
        <input
          id="title"
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2"
          value={title}
          onChange={e => {
            setTitle(e.target.value);
          }}
        />
      </div>
      <div>
        <label
          htmlFor="description"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Description
        </label>
        <textarea
          id="description"
          className="w-full rounded-lg border border-gray-300 px-4 py-2"
          rows={3}
          value={description}
          onChange={e => {
            setDescription(e.target.value);
          }}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="servings"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Servings
          </label>
          <input
            id="servings"
            type="number"
            min={1}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
            value={servings}
            onChange={e => {
              setServings(Number(e.target.value));
            }}
          />
        </div>
        <div>
          <label
            htmlFor="prep"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Prep (min)
          </label>
          <input
            id="prep"
            type="number"
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
            value={prepTimeMin}
            onChange={e => {
              setPrepTimeMin(e.target.value);
            }}
          />
        </div>
        <div>
          <label
            htmlFor="cook"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Cook (min)
          </label>
          <input
            id="cook"
            type="number"
            className="w-full rounded-lg border border-gray-300 px-4 py-2"
            value={cookTimeMin}
            onChange={e => {
              setCookTimeMin(e.target.value);
            }}
          />
        </div>
      </div>
      <RecipeImageField
        imagePreview={imagePreview || null}
        imageUploading={imageUploading}
        imageGenerating={imageGenerating}
        imageError={imageError}
        canGenerateImage={title.trim().length > 0}
        onImageFile={processImageFile}
        onGenerateImage={handleGenerateImage}
        onRemove={() => {
          clearPendingImage();
          setImageUrl('');
          setImageError(null);
        }}
      />
      <div>
        <label
          htmlFor="sourceUrl"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Source URL
        </label>
        <input
          id="sourceUrl"
          className="w-full rounded-lg border border-gray-300 px-4 py-2"
          value={sourceUrl}
          onChange={e => {
            setSourceUrl(e.target.value);
          }}
        />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Tags</p>
        <TagPicker
          selectedIds={tagIds}
          onChange={setTagIds}
        />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">Ingredients</p>
          <button
            type="button"
            className="text-primary text-sm"
            onClick={() => {
              setIngredients(prev => [...prev, emptyIngredient(prev.length)]);
            }}
          >
            + Add
          </button>
        </div>
        {ingredients.map((ing, i) => (
          <div
            key={i}
            className="mb-2 grid grid-cols-12 gap-2"
          >
            <input
              className="
                col-span-2 rounded border border-gray-300 px-2 py-1 text-sm
              "
              placeholder="Qty"
              value={ing.quantity ?? ''}
              onChange={e => {
                updateIngredient(
                  i,
                  'quantity',
                  e.target.value === '' ? null : e.target.value,
                );
              }}
            />
            <input
              className="
                col-span-2 rounded border border-gray-300 px-2 py-1 text-sm
              "
              placeholder="Unit"
              value={ing.unit ?? ''}
              onChange={e => {
                updateIngredient(i, 'unit', e.target.value || null);
              }}
            />
            <input
              className="
                col-span-6 rounded border border-gray-300 px-2 py-1 text-sm
              "
              placeholder="Name"
              required
              value={ing.name}
              onChange={e => {
                updateIngredient(i, 'name', e.target.value);
              }}
            />
            <button
              type="button"
              className="col-span-2 text-sm text-red-600"
              onClick={() => {
                setIngredients(prev => prev.filter((_, idx) => idx !== i));
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">Instructions</p>
          <button
            type="button"
            className="text-primary text-sm"
            onClick={() => {
              setInstructions(prev => [
                ...prev,
                emptyInstruction(prev.length + 1),
              ]);
            }}
          >
            + Add
          </button>
        </div>
        {instructions.map((ins, i) => (
          <div
            key={i}
            className="mb-2 flex gap-2"
          >
            <span className="text-muted pt-2 text-sm">{i + 1}.</span>
            <textarea
              className="
                flex-1 rounded border border-gray-300 px-2 py-1 text-sm
              "
              required
              rows={2}
              value={ins.body}
              onChange={e => {
                updateInstruction(i, e.target.value);
              }}
            />
            <button
              type="button"
              className="text-sm text-red-600"
              onClick={() => {
                setInstructions(prev => prev.filter((_, idx) => idx !== i));
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="
          bg-primary w-full rounded-lg py-3 font-semibold text-white
          disabled:opacity-50
        "
      >
        {loading ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
};
