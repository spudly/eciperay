/* eslint-disable max-lines -- shared recipe form host with dynamic ingredient/instruction lists */
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
  queryKeys,
  RECIPE_STATUS_LABELS,
  RECIPE_STATUS_OPTIONS,
  revertVersionScalar,
  toRecipeInputIngredients,
  toRecipeInputInstructions,
  uploadRecipeImage,
  useAuth,
  validateRecipeImageFile,
  type FormIngredientRow,
  type FormInstructionRow,
  type RecipeFormInitial,
  type VersionScalarField,
} from '@eciperay/client';
import type {
  IngredientInput,
  RecipeInput,
  RecipeStatus,
  RecipeVersionDetail,
} from '@eciperay/types';
import {RecipeFormPage, type RecipeFormPageField} from '@spudly/ui/pages';
import {useQuery} from '@tanstack/react-query';
import {useEffect, useMemo, useState} from 'react';

import {eciperay} from '../lib/api.js';
import {imageBase64ToFile} from '../lib/imageBase64ToFile.js';
import {
  getImageFileFromDataTransfer,
  shouldIgnoreImagePaste,
} from '../lib/recipeImageInput.js';
import {
  stripImageCacheKey,
  withImageCacheKey,
} from '../lib/recipeImagePreviewUrl.js';
import {supabase} from '../lib/supabase.js';

import {RecipeImageField} from '../components/recipe/RecipeImageField.js';
import {
  createEmptyIngredientRow,
  SortableIngredientList,
} from '../components/recipe/SortableIngredientList.js';
import {
  createEmptyInstructionRow,
  SortableInstructionList,
} from '../components/recipe/SortableInstructionList.js';

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

/**
 * Web-side host for the design system's RecipeFormPage (design-system#124, B3a;
 * web adoption B7 cluster C8): this component owns everything the B2 audit
 * leaves in the app — the form state, the tags query, image processing and
 * upload, the AI description/image calls, parent-version diffing, and building
 * the RecipeInput — and renders the DS page with web's image field and sortable
 * lists in its render slots (the file-input invocation and the dnd-kit drag
 * lists stay web-side as the slot implementations, B3a Option A). The route
 * pages wrap this host in the DS shell pages (EditRecipePage / EditVersionPage
 * / ManualEntryPage).
 */
export const RecipeFormHost = ({
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
  const [servings, setServings] = useState(String(initial.servings));
  const [prepTimeMin, setPrepTimeMin] = useState(
    initial.prepTimeMin === null || initial.prepTimeMin === undefined
      ? ''
      : String(initial.prepTimeMin),
  );
  const [cookTimeMin, setCookTimeMin] = useState(
    initial.cookTimeMin === null || initial.cookTimeMin === undefined
      ? ''
      : String(initial.cookTimeMin),
  );
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
  const [status, setStatus] = useState<RecipeStatus>(initial.status ?? 'idea');
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

  // The tags query lived in the TagPicker container before the split;
  // the DS page takes the options as view-models, so the query moves
  // here with the rest of the form's data (the app host's pattern).
  const {data: tags = [], isLoading: isLoadingTags} = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => eciperay.tags.list(),
  });
  const tagOptions = useMemo(
    () => tags.map(tag => ({value: tag.id, label: tag.name})),
    [tags],
  );
  const statusOptions = useMemo(
    () =>
      RECIPE_STATUS_OPTIONS.map(value => ({
        value,
        label: RECIPE_STATUS_LABELS[value],
      })),
    [],
  );

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
    servings: Number(servings),
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

  // The diff crosses to the DS page as presentation data: which fields
  // changed (the page field names — imageUrl is the image section's
  // "image") and the pre-formatted parent-value hint for each changed
  // field's revert affordance.
  const changedFields: RecipeFormPageField[] = [];
  const revertLabels: Partial<Record<RecipeFormPageField, string>> = {};
  if (parentVersion && versionDiff) {
    for (const field of versionDiff.changedScalars) {
      const pageField: RecipeFormPageField =
        field === 'imageUrl' ? 'image' : field;
      changedFields.push(pageField);
      revertLabels[pageField] = formatParentScalarHint(parentVersion, field);
    }
  }

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
        setServings(String(value ?? 1));
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

  const handleRevertField = (field: RecipeFormPageField) => {
    if (!parentVersion) {
      return;
    }
    revertScalar(parentVersion, field === 'image' ? 'imageUrl' : field);
  };

  const handleSubmit = async () => {
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

  return (
    <div onPaste={handleFormPaste}>
      <RecipeFormPage
        title={title}
        onTitleChange={setTitle}
        description={description}
        onDescriptionChange={setDescription}
        servings={servings}
        onServingsChange={setServings}
        prepTimeMin={prepTimeMin}
        onPrepTimeMinChange={setPrepTimeMin}
        cookTimeMin={cookTimeMin}
        onCookTimeMinChange={setCookTimeMin}
        sourceUrl={sourceUrl}
        onSourceUrlChange={setSourceUrl}
        statusOptions={statusOptions}
        status={status}
        onStatusChange={value => {
          setStatus(value as RecipeStatus);
        }}
        tagOptions={tagOptions}
        tagIds={tagIds}
        onTagIdsChange={setTagIds}
        isLoadingTags={isLoadingTags}
        changedFields={changedFields}
        revertLabels={revertLabels}
        onRevertField={handleRevertField}
        {...(parentVersion && versionDiff?.tagsChanged
          ? {
              tagsRevertLabel: formatParentTagNames(parentVersion),
              onRevertTags: () => {
                setTagIds(parentTagIds(parentVersion));
              },
            }
          : {})}
        {...(parentVersion && versionDiff?.ingredientsChanged
          ? {
              ingredientsChangedLabel: `Ingredients changed from parent version (${formatParentListSummary(parentVersion, 'ingredients')})`,
              onRevertIngredients: () => {
                setIngredients(
                  ensureIngredientRowKeys(
                    parentIngredientsInput(parentVersion),
                  ),
                );
              },
            }
          : {})}
        {...(parentVersion && versionDiff?.instructionsChanged
          ? {
              instructionsChangedLabel: `Instructions changed from parent version (${formatParentListSummary(parentVersion, 'instructions')})`,
              onRevertInstructions: () => {
                setInstructions(
                  ensureInstructionRowKeys(
                    parentInstructionsInput(parentVersion),
                  ),
                );
              },
            }
          : {})}
        onGenerateDescription={() => {
          void handleGenerateDescription();
        }}
        isGeneratingDescription={descriptionGenerating}
        descriptionError={descriptionError}
        contentLocked={contentLocked}
        renderImageSection={revertAction => (
          <RecipeImageField
            imagePreview={imagePreview || null}
            imageUploading={imageUploading}
            imageGenerating={imageGenerating}
            imageError={imageError}
            canGenerateImage={title.trim().length > 0}
            headerAction={revertAction}
            onImageFile={processImageFile}
            onGenerateImage={handleGenerateImage}
            onRemove={() => {
              clearPendingImage();
              setImageUrl('');
              setImageCacheKey(0);
              setImageError(null);
            }}
          />
        )}
        renderIngredientsSection={() => (
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
        renderInstructionsSection={() => (
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
        submitLabel={submitLabel}
        isSubmitting={loading}
        submitError={error}
        onSubmit={() => {
          void handleSubmit();
        }}
      />
    </div>
  );
};
