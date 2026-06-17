/* eslint-disable max-lines -- shared recipe form with dynamic ingredient/instruction lists */
import {uploadRecipeImageFromBase64, useAuth} from '@eciperay/client';
import type {
  IngredientInput,
  InstructionInput,
  RecipeInput,
} from '@eciperay/types';
import React, {useState} from 'react';
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

import {RecipeImageField} from './RecipeImageField';
import {TagPicker} from './TagPicker';

type Props = {
  initial: RecipeInput;
  recipeId?: string;
  submitLabel: string;
  onSubmit: (
    input: RecipeInput,
    pendingImage?: PendingRecipeImage,
  ) => Promise<void>;
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
  const [ingredients, setIngredients] = useState<FormIngredient[]>(
    initial.ingredients.length > 0 ? initial.ingredients : [emptyIngredient(0)],
  );
  const [instructions, setInstructions] = useState<InstructionInput[]>(
    initial.instructions.length > 0
      ? initial.instructions
      : [emptyInstruction(1)],
  );
  const [tagIds, setTagIds] = useState<string[]>(initial.tagIds);
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
    ingredients: ingredients.map((ing, i) => ({
      ...ing,
      sortOrder: i,
      quantity: toQuantity(ing.quantity),
    })),
    instructions: instructions.map((ins, i) => ({...ins, stepNumber: i + 1})),
    tagIds,
  });

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
      <View className="gap-4 pb-8">
        <View>
          <Text className="mb-1 text-sm font-medium text-gray-700">Title</Text>
          <TextInput
            accessibilityLabel="Title"
            className="rounded-lg border border-gray-300 px-4 py-2"
            value={title}
            onChangeText={setTitle}
          />
        </View>
        <View>
          <View className="mb-1 flex-row items-center justify-between gap-3">
            <Text className="text-sm font-medium text-gray-700">
              Description
            </Text>
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
          <TextInput
            className="rounded-lg border border-gray-300 px-4 py-2"
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />
          {descriptionError ? (
            <Text className="mt-2 text-sm text-red-600">
              {descriptionError}
            </Text>
          ) : null}
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-1 text-sm font-medium text-gray-700">
              Servings
            </Text>
            <TextInput
              className="rounded-lg border border-gray-300 px-4 py-2"
              keyboardType="number-pad"
              value={servings}
              onChangeText={setServings}
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-sm font-medium text-gray-700">
              Prep (min)
            </Text>
            <TextInput
              className="rounded-lg border border-gray-300 px-4 py-2"
              keyboardType="number-pad"
              value={prepTimeMin}
              onChangeText={setPrepTimeMin}
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-sm font-medium text-gray-700">
              Cook (min)
            </Text>
            <TextInput
              className="rounded-lg border border-gray-300 px-4 py-2"
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
          <Text className="mb-1 text-sm font-medium text-gray-700">
            Source URL
          </Text>
          <TextInput
            className="rounded-lg border border-gray-300 px-4 py-2"
            value={sourceUrl}
            onChangeText={setSourceUrl}
          />
        </View>
        <View>
          <Text className="mb-2 text-sm font-medium text-gray-700">Tags</Text>
          <TagPicker
            selectedIds={tagIds}
            onChange={setTagIds}
          />
        </View>
        <View>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-gray-700">
              Ingredients
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIngredients(prev => [...prev, emptyIngredient(prev.length)]);
              }}
            >
              <Text className="text-primary text-sm">+ Add</Text>
            </TouchableOpacity>
          </View>
          {ingredients.map((ing, i) => (
            <View
              key={i}
              className="mb-2 flex-row gap-2"
            >
              <TextInput
                className="
                  w-14 rounded border border-gray-300 px-2 py-1 text-sm
                "
                placeholder="Qty"
                value={ing.quantity === null ? '' : String(ing.quantity)}
                onChangeText={val => {
                  updateIngredient(i, 'quantity', val === '' ? null : val);
                }}
              />
              <TextInput
                className="
                  w-16 rounded border border-gray-300 px-2 py-1 text-sm
                "
                placeholder="Unit"
                value={ing.unit ?? ''}
                onChangeText={val => {
                  updateIngredient(i, 'unit', val || null);
                }}
              />
              <TextInput
                className="
                  flex-1 rounded border border-gray-300 px-2 py-1 text-sm
                "
                placeholder="Name"
                value={ing.name}
                onChangeText={val => {
                  updateIngredient(i, 'name', val);
                }}
              />
              <TouchableOpacity
                onPress={() => {
                  setIngredients(prev => prev.filter((_, idx) => idx !== i));
                }}
              >
                <Text className="text-sm text-red-600">Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-gray-700">
              Instructions
            </Text>
            <TouchableOpacity
              onPress={() => {
                setInstructions(prev => [
                  ...prev,
                  emptyInstruction(prev.length + 1),
                ]);
              }}
            >
              <Text className="text-primary text-sm">+ Add</Text>
            </TouchableOpacity>
          </View>
          {instructions.map((ins, i) => (
            <View
              key={i}
              className="mb-2 flex-row gap-2"
            >
              <Text className="text-muted pt-2 text-sm">{i + 1}.</Text>
              <TextInput
                className="
                  flex-1 rounded border border-gray-300 px-2 py-1 text-sm
                "
                multiline
                value={ins.body}
                onChangeText={val => {
                  updateInstruction(i, val);
                }}
              />
              <TouchableOpacity
                onPress={() => {
                  setInstructions(prev => prev.filter((_, idx) => idx !== i));
                }}
              >
                <Text className="text-sm text-red-600">Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
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
