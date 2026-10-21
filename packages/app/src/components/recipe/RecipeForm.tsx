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
import {
  Button as DsButton,
  InlineAlert,
  MultilineField as DsMultilineField,
  Text as DsText,
  TextField as DsTextField,
  tokens,
} from '@spudly/ui';
import React, {useMemo, useState} from 'react';
import {ScrollView, TouchableOpacity} from 'react-native';
import {XStack, YStack} from 'tamagui';

import {
  deleteImagePreviewFile,
  type PendingRecipeImage,
  stripImageCacheKey,
  withImageCacheKey,
  writeBase64ImagePreview,
} from '../../lib/recipeImageAsset';
import {api} from '../../lib/api';
import {supabase} from '../../lib/supabase';
import {ErrorText} from '../ui/ErrorText';
import {PrimaryButton} from '../ui/PrimaryButton';

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

const scrollStyle = {flex: 1} as const;

const toQuantity = (value: number | string | null): number | null => {
  if (value === null) {
    return null;
  }
  return typeof value === 'number' ? value : Number(value);
};

// Field backgrounds (issue #167): fields here render through @spudly/ui
// components, which all share the Warm Harvest $surface field background.
// The web mirror matches via its bg-field token (#fffdf8, the same surface).
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

  // A field whose value differs from the parent version gets the DS warning
  // wash (warning step 5 border / step 1 fill — the old amber-400/amber-50)
  // on top of the DS field chrome.
  const changedFieldProps = (field: VersionScalarField) =>
    scalarChanged(field)
      ? {
          borderColor: tokens.colors.warning.warning5,
          backgroundColor: tokens.colors.warning.warning1,
        }
      : {};

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
        <DsText
          fontSize={tokens.typography.fontSize.xs}
          fontWeight={tokens.typography.fontWeight.medium}
          color={tokens.colors.warning.warning9}
          opacity={0.8}
        >
          Revert to: {formatParentScalarHint(parentVersion, field)}
        </DsText>
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

  const fieldLabel = (label: string) => (
    <DsText
      fontSize={tokens.typography.fontSize.sm}
      fontWeight={tokens.typography.fontWeight.medium}
      color={tokens.colors.gray.gray8}
    >
      {label}
    </DsText>
  );

  return (
    <ScrollView
      style={scrollStyle}
      keyboardShouldPersistTaps="handled"
    >
      <YStack
        gap="$4"
        paddingBlockEnd="$8"
      >
        <YStack>
          <XStack
            marginBlockEnd="$1"
            alignItems="center"
            justifyContent="space-between"
            gap="$3"
          >
            {fieldLabel('Title')}
            <RevertButton field="title" />
          </XStack>
          <DsTextField
            accessibilityLabel="Title"
            {...changedFieldProps('title')}
            value={title}
            onChangeText={setTitle}
          />
        </YStack>
        <RecipeStatusPicker
          value={status}
          onChange={setStatus}
        />
        <YStack>
          <XStack
            marginBlockEnd="$1"
            alignItems="center"
            justifyContent="space-between"
            gap="$3"
          >
            {fieldLabel('Description')}
            <XStack
              alignItems="center"
              gap="$2"
            >
              <RevertButton field="description" />
              <DsButton
                variant="ghost"
                size="sm"
                accessibilityLabel="Generate description with AI"
                borderWidth={1}
                borderColor="$primary"
                backgroundColor="$surface"
                disabled={!title.trim() || descriptionGenerating}
                onPress={() => {
                  void handleGenerateDescription();
                }}
              >
                {descriptionGenerating ? 'Generating…' : 'Generate with AI'}
              </DsButton>
            </XStack>
          </XStack>
          <DsMultilineField
            {...changedFieldProps('description')}
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />
          {descriptionError ? (
            <DsText
              variant="error"
              marginBlockStart="$2"
            >
              {descriptionError}
            </DsText>
          ) : null}
        </YStack>
        <XStack gap="$3">
          <YStack flex={1}>
            <XStack
              marginBlockEnd="$1"
              alignItems="center"
              justifyContent="space-between"
              gap="$2"
            >
              {fieldLabel('Servings')}
              <RevertButton field="servings" />
            </XStack>
            <DsTextField
              accessibilityLabel="Servings"
              {...changedFieldProps('servings')}
              keyboardType="number-pad"
              value={servings}
              onChangeText={setServings}
            />
          </YStack>
          <YStack flex={1}>
            <XStack
              marginBlockEnd="$1"
              alignItems="center"
              justifyContent="space-between"
              gap="$2"
            >
              {fieldLabel('Prep (min)')}
              <RevertButton field="prepTimeMin" />
            </XStack>
            <DsTextField
              accessibilityLabel="Prep (min)"
              {...changedFieldProps('prepTimeMin')}
              keyboardType="number-pad"
              value={prepTimeMin}
              onChangeText={setPrepTimeMin}
            />
          </YStack>
          <YStack flex={1}>
            <XStack
              marginBlockEnd="$1"
              alignItems="center"
              justifyContent="space-between"
              gap="$2"
            >
              {fieldLabel('Cook (min)')}
              <RevertButton field="cookTimeMin" />
            </XStack>
            <DsTextField
              accessibilityLabel="Cook (min)"
              {...changedFieldProps('cookTimeMin')}
              keyboardType="number-pad"
              value={cookTimeMin}
              onChangeText={setCookTimeMin}
            />
          </YStack>
        </XStack>
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
        <YStack>
          <XStack
            marginBlockEnd="$1"
            alignItems="center"
            justifyContent="space-between"
            gap="$2"
          >
            {fieldLabel('Source URL')}
            <RevertButton field="sourceUrl" />
          </XStack>
          <DsTextField
            accessibilityLabel="Source URL"
            {...changedFieldProps('sourceUrl')}
            value={sourceUrl}
            onChangeText={setSourceUrl}
          />
        </YStack>
        <YStack>
          <XStack
            marginBlockEnd="$2"
            alignItems="center"
            justifyContent="space-between"
            gap="$2"
          >
            {fieldLabel('Tags')}
            {versionDiff?.tagsChanged && parentVersion ? (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  setTagIds(parentTagIds(parentVersion));
                }}
              >
                <DsText
                  fontSize={tokens.typography.fontSize.xs}
                  fontWeight={tokens.typography.fontWeight.medium}
                  color={tokens.colors.warning.warning9}
                  opacity={0.8}
                >
                  Revert to: {formatParentTagNames(parentVersion)}
                </DsText>
              </TouchableOpacity>
            ) : null}
          </XStack>
          <TagPicker
            selectedIds={tagIds}
            onChange={setTagIds}
          />
        </YStack>
        {contentLocked ? (
          <InlineAlert severity="warning">
            Ingredients and instructions are locked on the active version.
            Create a draft to change them.
          </InlineAlert>
        ) : null}
        {versionDiff?.ingredientsChanged && parentVersion && !contentLocked ? (
          <XStack
            alignItems="center"
            justifyContent="space-between"
            borderRadius={tokens.radii.md}
            backgroundColor={tokens.colors.warning.warning1}
            paddingHorizontal="$3"
            paddingVertical="$2"
          >
            <DsText
              flex={1}
              fontSize={tokens.typography.fontSize.sm}
              color={tokens.colors.warning.warning10}
            >
              Ingredients changed from parent version (
              {formatParentListSummary(parentVersion, 'ingredients')})
            </DsText>
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
              <DsText
                fontSize={tokens.typography.fontSize.sm}
                fontWeight={tokens.typography.fontWeight.medium}
                color={tokens.colors.warning.warning10}
                textDecorationLine="underline"
              >
                Revert
              </DsText>
            </TouchableOpacity>
          </XStack>
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
          <XStack
            alignItems="center"
            justifyContent="space-between"
            borderRadius={tokens.radii.md}
            backgroundColor={tokens.colors.warning.warning1}
            paddingHorizontal="$3"
            paddingVertical="$2"
          >
            <DsText
              flex={1}
              fontSize={tokens.typography.fontSize.sm}
              color={tokens.colors.warning.warning10}
            >
              Instructions changed from parent version (
              {formatParentListSummary(parentVersion, 'instructions')})
            </DsText>
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
              <DsText
                fontSize={tokens.typography.fontSize.sm}
                fontWeight={tokens.typography.fontWeight.medium}
                color={tokens.colors.warning.warning10}
                textDecorationLine="underline"
              >
                Revert
              </DsText>
            </TouchableOpacity>
          </XStack>
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
        {error ? <ErrorText>{error}</ErrorText> : null}
        <PrimaryButton
          label={submitLabel}
          loading={loading}
          loadingLabel="Saving…"
          onPress={() => {
            void handleSubmit();
          }}
        />
      </YStack>
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
