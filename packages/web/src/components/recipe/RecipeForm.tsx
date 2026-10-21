/* eslint-disable max-lines -- shared recipe form with dynamic ingredient/instruction lists */
import {
  compareVersionToParent,
  ensureIngredientRowKeys,
  ensureInstructionRowKeys,
  formatParentListSummary,
  formatParentScalarHint,
  formatParentTagNames,
  parentIngredientsInput,
  parentInstructionsInput,
  parentTagIds,
  makeRecipeDetail,
  recipeDetailToInput,
  revertVersionScalar,
  toRecipeInputIngredients,
  toRecipeInputInstructions,
  uploadRecipeImage,
  useAuth,
  validateRecipeImageFile,
  type FormIngredientRow,
  type FormInstructionRow,
  type RecipeFormInitial,
  type ShowcaseDemoRenderer,
  type VersionScalarField,
} from '@eciperay/client';
import type {
  IngredientInput,
  RecipeInput,
  RecipeVersionDetail,
} from '@eciperay/types';
import clsx from 'clsx';
import {useEffect, useMemo, useState} from 'react';

import {
  getImageFileFromDataTransfer,
  shouldIgnoreImagePaste,
} from '../../lib/recipeImageInput.js';
import {eciperay} from '../../lib/api.js';
import {imageBase64ToFile} from '../../lib/imageBase64ToFile.js';
import {
  stripImageCacheKey,
  withImageCacheKey,
} from '../../lib/recipeImagePreviewUrl.js';
import {supabase} from '../../lib/supabase.js';

import {RecipeStatusPicker} from './RecipeStatusPicker.js';
import {RecipeImageField} from './RecipeImageField.js';
import {
  createEmptyIngredientRow,
  SortableIngredientList,
} from './SortableIngredientList.js';
import {
  createEmptyInstructionRow,
  SortableInstructionList,
} from './SortableInstructionList.js';
import {TagPicker} from './TagPicker.js';

type Props = {
  initial: RecipeFormInitial;
  recipeId?: string;
  parentVersion?: RecipeVersionDetail;
  contentLocked?: boolean;
  submitLabel: string;
  onSubmit: (input: RecipeInput, pendingImage?: File) => Promise<void>;
};

type FormIngredient = FormIngredientRow & {quantity: number | string | null};

const toQuantity = (value: number | string | null): number | null => {
  if (value === null) {
    return null;
  }
  return typeof value === 'number' ? value : Number(value);
};

export const RecipeForm = ({
  initial,
  recipeId,
  parentVersion,
  contentLocked = false,
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
  const [ingredients, setIngredients] = useState<FormIngredient[]>(() => {
    const sorted = ensureIngredientRowKeys(
      [...initial.ingredients].sort((a, b) => a.sortOrder - b.sortOrder),
    );
    if (sorted.length > 0) {
      return sorted;
    }
    return [createEmptyIngredientRow(0)];
  });
  const [instructions, setInstructions] = useState<FormInstructionRow[]>(() => {
    const sorted = ensureInstructionRowKeys(
      [...initial.instructions].sort((a, b) => a.stepNumber - b.stepNumber),
    );
    if (sorted.length > 0) {
      return sorted;
    }
    return [createEmptyInstructionRow(1)];
  });
  const [tagIds, setTagIds] = useState<string[]>(initial.tagIds);
  const [status, setStatus] = useState(initial.status ?? 'idea');
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imageCacheKey, setImageCacheKey] = useState(0);
  const [descriptionGenerating, setDescriptionGenerating] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

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
        setImageUrl(
          stripImageCacheKey(
            await uploadRecipeImage(supabase, file, userId, recipeId),
          ),
        );
        setImageCacheKey(Date.now());
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

  const handleGenerateDescription = async () => {
    const trimmedTitle = title.trim();
    /* c8 ignore next 4 -- generate button is disabled when title is empty */
    if (!trimmedTitle) {
      setDescriptionError('Add a title before generating a description');
      return;
    }
    if (!session?.user.id) {
      setDescriptionError('Sign in to generate descriptions');
      return;
    }
    setDescriptionError(null);
    setDescriptionGenerating(true);
    try {
      const ingredientNames = ingredients
        .map(ingredient => ingredient.name.trim())
        .filter(Boolean);
      const instructionBodies = instructions
        .map(instruction => instruction.body.trim())
        .filter(Boolean);
      const {description: generatedDescription} =
        await eciperay.ai.generateDescription({
          title: trimmedTitle,
          ingredients: ingredientNames,
          instructions: instructionBodies,
          prepTimeMin: prepTimeMin === '' ? null : Number(prepTimeMin),
          cookTimeMin: cookTimeMin === '' ? null : Number(cookTimeMin),
        });
      setDescription(generatedDescription);
    } catch (error_) {
      setDescriptionError(
        error_ instanceof Error
          ? error_.message
          : 'Failed to generate description',
      );
    } finally {
      setDescriptionGenerating(false);
    }
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
      const imageIngredients = ingredients
        .map(ingredient => ({
          name: ingredient.name.trim(),
          quantity: toQuantity(ingredient.quantity),
          unit: ingredient.unit,
        }))
        .filter(ingredient => ingredient.name);
      const instructionBodies = instructions
        .map(instruction => instruction.body.trim())
        .filter(Boolean);
      const {imageBase64, contentType} = await eciperay.ai.generateImage({
        title: trimmedTitle,
        description: description || null,
        ingredients: imageIngredients,
        instructions: instructionBodies,
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
    imageUrl: pendingImageFile ? null : stripImageCacheKey(imageUrl) || null,
    sourceUrl: sourceUrl || null,
    ingredients: contentLocked
      ? initial.ingredients
      : toRecipeInputIngredients(
          ingredients.map(ingredient => ({
            ...ingredient,
            quantity: toQuantity(ingredient.quantity),
          })),
        ),
    instructions: contentLocked
      ? initial.instructions
      : toRecipeInputInstructions(instructions),
    tagIds,
    status,
  });

  const versionDiff = useMemo(() => {
    if (!parentVersion) {
      return null;
    }
    return compareVersionToParent(parentVersion, buildInput());
    // buildInput is derived from the field state listed below
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional field snapshot
  }, [
    parentVersion,
    title,
    description,
    servings,
    prepTimeMin,
    cookTimeMin,
    imageUrl,
    sourceUrl,
    ingredients,
    instructions,
    tagIds,
    pendingImageFile,
    status,
  ]);

  const scalarChanged = (field: VersionScalarField) =>
    versionDiff?.changedScalars.includes(field) ?? false;

  const changedFieldClass = (field: VersionScalarField) =>
    clsx({
      'border-amber-400 bg-amber-50': scalarChanged(field),
      // The shared field background (issue #167) must not be combined with
      // bg-amber-50 on the same element: in the built CSS bg-field sorts
      // after bg-amber-50 and would erase the changed-field highlight.
      'bg-field': !scalarChanged(field),
    });

  const revertScalar = (
    parent: RecipeVersionDetail,
    field: VersionScalarField,
  ) => {
    const value = revertVersionScalar(parent, field);
    switch (field) {
      case 'title': {
        setTitle(String(value ?? ''));
        break;
      }
      case 'description': {
        setDescription(String(value ?? ''));
        break;
      }
      case 'servings': {
        setServings(Number(value ?? 1));
        break;
      }
      case 'prepTimeMin': {
        setPrepTimeMin(value === null ? '' : String(value));
        break;
      }
      case 'cookTimeMin': {
        setCookTimeMin(value === null ? '' : String(value));
        break;
      }
      case 'imageUrl': {
        clearPendingImage();
        setImageUrl(String(value ?? ''));
        break;
      }
      case 'sourceUrl': {
        setSourceUrl(String(value ?? ''));
        break;
      }
    }
  };

  const RevertButton = ({field}: {field: VersionScalarField}) =>
    scalarChanged(field) && parentVersion ? (
      <button
        type="button"
        className="text-xs font-medium text-amber-800/80"
        onClick={() => {
          revertScalar(parentVersion, field);
        }}
      >
        Revert to: {formatParentScalarHint(parentVersion, field)}
      </button>
    ) : null;

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

  const imagePreview =
    previewUrl ??
    (imageUrl && imageCacheKey > 0
      ? withImageCacheKey(imageUrl, imageCacheKey)
      : imageUrl);

  // The app mirror wraps the form in its own ScrollView with
  // keyboardShouldPersistTaps="handled" (see the app RecipeForm); on web the
  // document scrolls and taps are native browser behavior, so a plain form
  // element is the whole story here.
  return (
    <form
      onSubmit={e => {
        void handleSubmit(e);
      }}
      onPaste={handleFormPaste}
      className="space-y-6"
    >
      <div>
        <div className="mbe-1 flex items-center justify-between gap-3">
          <label
            htmlFor="title"
            className="text-sm font-medium text-gray-700"
          >
            Title
          </label>
          <RevertButton field="title" />
        </div>
        <input
          id="title"
          required
          className={clsx(
            'rounded-lg border border-gray-300 px-4 py-2 inline-full',
            changedFieldClass('title'),
          )}
          value={title}
          onChange={e => {
            setTitle(e.target.value);
          }}
        />
      </div>
      <RecipeStatusPicker
        value={status}
        onChange={setStatus}
      />
      <div>
        <div className="mbe-1 flex items-center justify-between gap-3">
          <label
            htmlFor="description"
            className="text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <div className="flex items-center gap-2">
            <RevertButton field="description" />
            <button
              type="button"
              aria-label="Generate description with AI"
              className="
                border-primary text-primary inline-flex shrink-0 rounded-lg
                border bg-white px-3 py-1 text-sm font-medium
                disabled:cursor-not-allowed disabled:opacity-50
              "
              disabled={!title.trim() || descriptionGenerating}
              onClick={() => {
                void handleGenerateDescription();
              }}
            >
              {descriptionGenerating ? 'Generating…' : 'Generate with AI'}
            </button>
          </div>
        </div>
        <textarea
          id="description"
          className={clsx(
            'rounded-lg border border-gray-300 px-4 py-2 inline-full',
            changedFieldClass('description'),
          )}
          rows={3}
          value={description}
          onChange={e => {
            setDescription(e.target.value);
          }}
        />
        {descriptionError ? (
          <p className="mbs-2 text-sm text-red-600">{descriptionError}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="mbe-1 flex items-center justify-between gap-2">
            <label
              htmlFor="servings"
              className="text-sm font-medium text-gray-700"
            >
              Servings
            </label>
            <RevertButton field="servings" />
          </div>
          <input
            id="servings"
            type="number"
            min={1}
            required
            className={clsx(
              'rounded-lg border border-gray-300 px-4 py-2 inline-full',
              changedFieldClass('servings'),
            )}
            value={servings}
            onChange={e => {
              setServings(Number(e.target.value));
            }}
          />
        </div>
        <div>
          <div className="mbe-1 flex items-center justify-between gap-2">
            <label
              htmlFor="prep"
              className="text-sm font-medium text-gray-700"
            >
              Prep (min)
            </label>
            <RevertButton field="prepTimeMin" />
          </div>
          <input
            id="prep"
            type="number"
            className={clsx(
              'rounded-lg border border-gray-300 px-4 py-2 inline-full',
              changedFieldClass('prepTimeMin'),
            )}
            value={prepTimeMin}
            onChange={e => {
              setPrepTimeMin(e.target.value);
            }}
          />
        </div>
        <div>
          <div className="mbe-1 flex items-center justify-between gap-2">
            <label
              htmlFor="cook"
              className="text-sm font-medium text-gray-700"
            >
              Cook (min)
            </label>
            <RevertButton field="cookTimeMin" />
          </div>
          <input
            id="cook"
            type="number"
            className={clsx(
              'rounded-lg border border-gray-300 px-4 py-2 inline-full',
              changedFieldClass('cookTimeMin'),
            )}
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
        headerAction={<RevertButton field="imageUrl" />}
        onImageFile={processImageFile}
        onGenerateImage={handleGenerateImage}
        onRemove={() => {
          clearPendingImage();
          setImageUrl('');
          setImageCacheKey(0);
          setImageError(null);
        }}
      />
      <div>
        <div className="mbe-1 flex items-center justify-between gap-2">
          <label
            htmlFor="sourceUrl"
            className="text-sm font-medium text-gray-700"
          >
            Source URL
          </label>
          <RevertButton field="sourceUrl" />
        </div>
        <input
          id="sourceUrl"
          className={clsx(
            'rounded-lg border border-gray-300 px-4 py-2 inline-full',
            changedFieldClass('sourceUrl'),
          )}
          value={sourceUrl}
          onChange={e => {
            setSourceUrl(e.target.value);
          }}
        />
      </div>
      <div>
        <div className="mbe-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-700">Tags</p>
          {versionDiff?.tagsChanged && parentVersion ? (
            <button
              type="button"
              className="text-xs font-medium text-amber-800/80"
              onClick={() => {
                setTagIds(parentTagIds(parentVersion));
              }}
            >
              Revert to: {formatParentTagNames(parentVersion)}
            </button>
          ) : null}
        </div>
        <TagPicker
          selectedIds={tagIds}
          onChange={setTagIds}
        />
      </div>
      {contentLocked ? (
        <div
          className="
            rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm
            text-amber-900
          "
        >
          Ingredients and instructions are locked on the active version. Create
          a draft to change them.
        </div>
      ) : null}
      {versionDiff?.ingredientsChanged && parentVersion && !contentLocked ? (
        <div
          className="
            flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2
            text-sm text-amber-900
          "
        >
          <span>
            Ingredients changed from parent version (
            {formatParentListSummary(parentVersion, 'ingredients')})
          </span>
          <button
            type="button"
            className="font-medium underline"
            onClick={() => {
              setIngredients(
                ensureIngredientRowKeys(parentIngredientsInput(parentVersion)),
              );
            }}
          >
            Revert
          </button>
        </div>
      ) : null}
      {contentLocked ? null : (
        <SortableIngredientList
          ingredients={ingredients}
          onChange={setIngredients}
          onUpdate={updateIngredient}
          onAdd={() => {
            setIngredients(prev => [
              ...prev,
              createEmptyIngredientRow(prev.length),
            ]);
          }}
        />
      )}
      {versionDiff?.instructionsChanged && parentVersion && !contentLocked ? (
        <div
          className="
            flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2
            text-sm text-amber-900
          "
        >
          <span>
            Instructions changed from parent version (
            {formatParentListSummary(parentVersion, 'instructions')})
          </span>
          <button
            type="button"
            className="font-medium underline"
            onClick={() => {
              setInstructions(
                ensureInstructionRowKeys(
                  parentInstructionsInput(parentVersion),
                ),
              );
            }}
          >
            Revert
          </button>
        </div>
      ) : null}
      {contentLocked ? null : (
        <SortableInstructionList
          instructions={instructions}
          onChange={setInstructions}
          onUpdate={updateInstruction}
          onAdd={() => {
            setInstructions(prev => [
              ...prev,
              createEmptyInstructionRow(prev.length + 1),
            ]);
          }}
        />
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="
          bg-primary rounded-lg py-3 font-semibold text-white inline-full
          disabled:opacity-50
        "
      >
        {loading ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
};

if (import.meta.env.DEV) {
  const recipeFormDemo: ShowcaseDemoRenderer = ({Frame}) => (
    <Frame>
      <RecipeForm
        initial={recipeDetailToInput(makeRecipeDetail())}
        submitLabel="Save recipe"
        onSubmit={() => Promise.resolve()}
      />
    </Frame>
  );
  RecipeForm.demo = recipeFormDemo;
}
