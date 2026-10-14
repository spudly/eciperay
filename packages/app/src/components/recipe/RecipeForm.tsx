/* eslint-disable max-lines -- shared recipe form with dynamic ingredient/instruction lists */
import {
  compareVersionToParent,
  ensureIngredientRowKeys,
  ensureInstructionRowKeys,
  formatParentListSummary,
  formatParentScalarHint,
  formatParentTagNames,
  makeRecipeDetail,
  parentIngredientsInput,
  parentInstructionsInput,
  parentTagIds,
  recipeDetailToInput,
  revertVersionScalar,
  toRecipeInputIngredients,
  toRecipeInputInstructions,
  uploadRecipeImageFromBase64,
  useAuth,
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
import React, {useMemo, useState} from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  deleteImagePreviewFile,
  type PendingRecipeImage,
  stripImageCacheKey,
  withImageCacheKey,
  writeBase64ImagePreview,
} from '../../lib/recipeImageAsset';
import {api} from '../../lib/api';
import {supabase} from '../../lib/supabase';

import {RecipeStatusPicker} from './RecipeStatusPicker';
import {RecipeImageField} from './RecipeImageField';
import {
  createEmptyIngredientRow,
  SortableIngredientList,
} from './SortableIngredientList';
import {
  createEmptyInstructionRow,
  SortableInstructionList,
} from './SortableInstructionList';
import {TagPicker} from './TagPicker';

type Props = {
  initial: RecipeFormInitial;
  recipeId?: string;
  parentVersion?: RecipeVersionDetail;
  contentLocked?: boolean;
  submitLabel: string;
  onSubmit: (
    input: RecipeInput,
    pendingImage?: PendingRecipeImage,
  ) => Promise<void>;
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
  const [status, setStatus] = useState(initial.status ?? 'idea');
  const [pendingImage, setPendingImage] = useState<PendingRecipeImage | null>(
    null,
  );
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imageCacheKey, setImageCacheKey] = useState(0);
  const [descriptionGenerating, setDescriptionGenerating] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const clearPendingImage = () => {
    setPreviewUri(current => {
      if (current) {
        void deleteImagePreviewFile(current);
      }
      return null;
    });
    setPendingImage(null);
  };

  const processImage = async (image: PendingRecipeImage, preview: string) => {
    const userId = session?.user.id;
    if (!userId) {
      setImageError('Sign in to upload images');
      return;
    }
    setImageError(null);

    if (recipeId) {
      setImageUploading(true);
      setPreviewUri(preview);
      try {
        const uploadedUrl = stripImageCacheKey(
          await uploadRecipeImageFromBase64(
            supabase,
            image.base64,
            image.contentType,
            {userId, recipeId},
          ),
        );
        void deleteImagePreviewFile(preview);
        setPreviewUri(null);
        setPendingImage(null);
        setImageUrl(uploadedUrl);
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
    setPendingImage(image);
    setPreviewUri(preview);
  };

  const handleGenerateDescription = async () => {
    const trimmedTitle = title.trim();
    /* istanbul ignore next 3 -- generate button is disabled when title is empty */
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
        await api.ai.generateDescription({
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
    /* istanbul ignore next 3 -- generate button is disabled when title is empty */
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
      const {imageBase64, contentType} = await api.ai.generateImage({
        title: trimmedTitle,
        description: description || null,
        ingredients: imageIngredients,
        instructions: instructionBodies,
      });
      const image: PendingRecipeImage = {base64: imageBase64, contentType};
      const preview = await writeBase64ImagePreview(imageBase64, contentType);
      await processImage(image, preview);
    } catch (error_) {
      setImageError(
        error_ instanceof Error ? error_.message : 'Failed to generate image',
      );
    } finally {
      setImageGenerating(false);
    }
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
    imageUrl: pendingImage ? null : stripImageCacheKey(imageUrl) || null,
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
    pendingImage,
    status,
  ]);

  const scalarChanged = (field: VersionScalarField) =>
    versionDiff?.changedScalars.includes(field) ?? false;

  const changedFieldClass = (field: VersionScalarField) =>
    clsx('rounded-lg border border-gray-300 px-4 py-2', {
      'border-amber-400 bg-amber-50': scalarChanged(field),
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

  const RevertButton = ({field}: {field: VersionScalarField}) =>
    scalarChanged(field) && parentVersion ? (
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => {
          revertScalar(parentVersion, field);
        }}
      >
        <Text className="text-xs font-medium text-amber-800/80">
          Revert to: {formatParentScalarHint(parentVersion, field)}
        </Text>
      </TouchableOpacity>
    ) : null;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSubmit(buildInput(), pendingImage ?? undefined);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const imagePreview =
    previewUri ??
    (imageUrl && imageCacheKey > 0
      ? withImageCacheKey(imageUrl, imageCacheKey)
      : imageUrl);

  return (
    <ScrollView className="flex-1">
      <View className="gap-4 pbe-8">
        <View>
          <View className="mbe-1 flex-row items-center justify-between gap-3">
            <Text className="text-sm font-medium text-gray-700">Title</Text>
            <RevertButton field="title" />
          </View>
          <TextInput
            accessibilityLabel="Title"
            className={changedFieldClass('title')}
            value={title}
            onChangeText={setTitle}
          />
        </View>
        <RecipeStatusPicker
          value={status}
          onChange={setStatus}
        />
        <View>
          <View className="mbe-1 flex-row items-center justify-between gap-3">
            <Text className="text-sm font-medium text-gray-700">
              Description
            </Text>
            <View className="flex-row items-center gap-2">
              <RevertButton field="description" />
              <TouchableOpacity
                accessibilityLabel="Generate description with AI"
                className="
                  border-primary rounded-lg border bg-white px-3 py-1
                  disabled:opacity-50
                "
                disabled={!title.trim() || descriptionGenerating}
                onPress={() => {
                  void handleGenerateDescription();
                }}
              >
                <Text className="text-primary text-sm font-medium">
                  {descriptionGenerating ? 'Generating…' : 'Generate with AI'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            className={changedFieldClass('description')}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />
          {descriptionError ? (
            <Text className="mbs-2 text-sm text-red-600">
              {descriptionError}
            </Text>
          ) : null}
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <View className="mbe-1 flex-row items-center justify-between gap-2">
              <Text className="text-sm font-medium text-gray-700">
                Servings
              </Text>
              <RevertButton field="servings" />
            </View>
            <TextInput
              accessibilityLabel="Servings"
              className={changedFieldClass('servings')}
              keyboardType="number-pad"
              value={servings}
              onChangeText={setServings}
            />
          </View>
          <View className="flex-1">
            <View className="mbe-1 flex-row items-center justify-between gap-2">
              <Text className="text-sm font-medium text-gray-700">
                Prep (min)
              </Text>
              <RevertButton field="prepTimeMin" />
            </View>
            <TextInput
              accessibilityLabel="Prep (min)"
              className={changedFieldClass('prepTimeMin')}
              keyboardType="number-pad"
              value={prepTimeMin}
              onChangeText={setPrepTimeMin}
            />
          </View>
          <View className="flex-1">
            <View className="mbe-1 flex-row items-center justify-between gap-2">
              <Text className="text-sm font-medium text-gray-700">
                Cook (min)
              </Text>
              <RevertButton field="cookTimeMin" />
            </View>
            <TextInput
              accessibilityLabel="Cook (min)"
              className={changedFieldClass('cookTimeMin')}
              keyboardType="number-pad"
              value={cookTimeMin}
              onChangeText={setCookTimeMin}
            />
          </View>
        </View>
        <RecipeImageField
          imagePreview={imagePreview || null}
          imageUploading={imageUploading}
          imageGenerating={imageGenerating}
          imageError={imageError}
          canGenerateImage={title.trim().length > 0}
          headerAction={<RevertButton field="imageUrl" />}
          onImagePicked={processImage}
          onImageError={message => {
            setImageError(message);
          }}
          onGenerateImage={handleGenerateImage}
          onRemove={() => {
            clearPendingImage();
            setImageUrl('');
            setImageCacheKey(0);
            setImageError(null);
          }}
        />
        <View>
          <View className="mbe-1 flex-row items-center justify-between gap-2">
            <Text className="text-sm font-medium text-gray-700">
              Source URL
            </Text>
            <RevertButton field="sourceUrl" />
          </View>
          <TextInput
            accessibilityLabel="Source URL"
            className={changedFieldClass('sourceUrl')}
            value={sourceUrl}
            onChangeText={setSourceUrl}
          />
        </View>
        <View>
          <View className="mbe-2 flex-row items-center justify-between gap-2">
            <Text className="text-sm font-medium text-gray-700">Tags</Text>
            {versionDiff?.tagsChanged && parentVersion ? (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  setTagIds(parentTagIds(parentVersion));
                }}
              >
                <Text className="text-xs font-medium text-amber-800/80">
                  Revert to: {formatParentTagNames(parentVersion)}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <TagPicker
            selectedIds={tagIds}
            onChange={setTagIds}
          />
        </View>
        {contentLocked ? (
          <View
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
          >
            <Text className="text-sm text-amber-900">
              Ingredients and instructions are locked on the active version.
              Create a draft to change them.
            </Text>
          </View>
        ) : null}
        {versionDiff?.ingredientsChanged && parentVersion && !contentLocked ? (
          <View
            className="
              flex-row items-center justify-between rounded-lg bg-amber-50 px-3
              py-2
            "
          >
            <Text className="flex-1 text-sm text-amber-900">
              Ingredients changed from parent version (
              {formatParentListSummary(parentVersion, 'ingredients')})
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                setIngredients(
                  ensureIngredientRowKeys(
                    parentIngredientsInput(parentVersion),
                  ),
                );
              }}
            >
              <Text className="text-sm font-medium text-amber-900 underline">
                Revert
              </Text>
            </TouchableOpacity>
          </View>
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
          <View
            className="
              flex-row items-center justify-between rounded-lg bg-amber-50 px-3
              py-2
            "
          >
            <Text className="flex-1 text-sm text-amber-900">
              Instructions changed from parent version (
              {formatParentListSummary(parentVersion, 'instructions')})
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                setInstructions(
                  ensureInstructionRowKeys(
                    parentInstructionsInput(parentVersion),
                  ),
                );
              }}
            >
              <Text className="text-sm font-medium text-amber-900 underline">
                Revert
              </Text>
            </TouchableOpacity>
          </View>
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
        {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
        <TouchableOpacity
          className="
            bg-primary items-center rounded-lg py-3
            disabled:opacity-50
          "
          disabled={loading}
          onPress={() => {
            void handleSubmit();
          }}
        >
          <Text className="font-semibold text-white">
            {loading ? 'Saving…' : submitLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

if (__DEV__) {
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
