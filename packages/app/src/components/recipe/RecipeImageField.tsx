import React from 'react';
import {Image, Text, TouchableOpacity, View} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';

import {
  recipeImageFromAsset,
  type PendingRecipeImage,
} from '../../lib/recipeImageAsset';
import {confirmPhotoLibraryAccess} from '../../lib/androidPermissions';

import {recipeImagePreviewStyles} from './recipeImagePreviewStyles';

type Props = {
  imagePreview: string | null;
  imageUploading: boolean;
  imageGenerating?: boolean;
  imageError: string | null;
  canGenerateImage?: boolean;
  onImagePicked: (
    image: PendingRecipeImage,
    previewUri: string,
  ) => void | Promise<void>;
  onImageError?: (message: string) => void;
  onGenerateImage?: () => void | Promise<void>;
  onRemove: () => void;
};

export const RecipeImageField = ({
  imagePreview,
  imageUploading,
  imageGenerating = false,
  imageError,
  canGenerateImage = true,
  onImagePicked,
  onImageError,
  onGenerateImage,
  onRemove,
}: Props) => {
  const imageBusy = imageUploading || imageGenerating;

  const handlePick = async () => {
    const confirmed = await confirmPhotoLibraryAccess();
    if (!confirmed) {
      return;
    }

    const result = await launchImageLibrary({
      mediaType: 'photo',
      includeBase64: true,
    });
    if (result.didCancel) {
      return;
    }
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      return;
    }
    try {
      const image = recipeImageFromAsset(asset);
      await onImagePicked(image, asset.uri);
    } catch (error_) {
      onImageError?.(
        error_ instanceof Error ? error_.message : 'Failed to read image',
      );
    }
  };

  return (
    <View>
      <Text className="mb-1 text-sm font-medium text-gray-700">
        Recipe image
      </Text>
      <View
        className="
          mb-3 overflow-hidden rounded-lg border-2 border-dashed border-gray-300
          bg-gray-50
        "
      >
        {imagePreview ? (
          <View style={recipeImagePreviewStyles.frame}>
            <Image
              accessibilityLabel="Recipe preview"
              source={{uri: imagePreview}}
              resizeMode="contain"
              style={recipeImagePreviewStyles.image}
            />
          </View>
        ) : (
          <View
            className="px-4"
            style={recipeImagePreviewStyles.placeholder}
          >
            <Text className="text-muted text-center text-sm">
              Choose an image from your library or generate one with AI
            </Text>
          </View>
        )}
      </View>
      <View className="flex-row flex-wrap gap-3">
        <TouchableOpacity
          accessibilityLabel="Choose recipe image"
          className="
            bg-primary rounded-lg px-4 py-2
            disabled:opacity-50
          "
          disabled={imageBusy}
          onPress={() => {
            void handlePick();
          }}
        >
          <Text className="text-sm font-medium text-white">
            {imageUploading ? 'Uploading…' : 'Choose image'}
          </Text>
        </TouchableOpacity>
        {onGenerateImage ? (
          <TouchableOpacity
            accessibilityLabel="Generate image with AI"
            className="
              border-primary rounded-lg border bg-white px-4 py-2
              disabled:opacity-50
            "
            disabled={imageBusy || !canGenerateImage}
            onPress={() => {
              void onGenerateImage();
            }}
          >
            <Text className="text-primary text-sm font-medium">
              {imageGenerating ? 'Generating…' : 'Generate with AI'}
            </Text>
          </TouchableOpacity>
        ) : null}
        {imagePreview ? (
          <TouchableOpacity
            className="rounded-lg bg-gray-100 px-4 py-2"
            onPress={onRemove}
          >
            <Text className="text-sm text-gray-700">Remove image</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {imageError ? (
        <Text className="mt-2 text-sm text-red-600">{imageError}</Text>
      ) : null}
    </View>
  );
};
