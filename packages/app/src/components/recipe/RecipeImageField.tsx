/* eslint-disable max-lines -- recipe image upload, paste, and generate controls */
import {Button as DsButton, Text as DsText, tokens} from '@spudly/ui';
import React from 'react';
import {Image, View} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {XStack, YStack} from 'tamagui';

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
  headerAction?: React.ReactNode;
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
  headerAction,
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
    <YStack>
      <XStack
        marginBlockEnd="$1"
        alignItems="center"
        justifyContent="space-between"
        gap="$2"
      >
        <DsText
          fontSize={tokens.typography.fontSize.sm}
          fontWeight={tokens.typography.fontWeight.medium}
          color={tokens.colors.gray.gray8}
        >
          Recipe image
        </DsText>
        {headerAction}
      </XStack>
      <YStack
        marginBlockEnd="$3"
        overflow="hidden"
        borderRadius={tokens.radii.md}
        borderWidth={2}
        borderStyle="dashed"
        borderColor={tokens.colors.gray.gray4}
        backgroundColor={tokens.colors.gray.gray1}
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
            style={[
              recipeImagePreviewStyles.placeholder,
              {paddingHorizontal: tokens.spacing[4]},
            ]}
          >
            <DsText
              variant="hint"
              textAlign="center"
            >
              Choose an image from your library or generate one with AI
            </DsText>
          </View>
        )}
      </YStack>
      <XStack
        flexWrap="wrap"
        gap="$3"
      >
        <DsButton
          variant="primary"
          size="sm"
          accessibilityLabel="Choose recipe image"
          disabled={imageBusy}
          onPress={() => {
            void handlePick();
          }}
        >
          {imageUploading ? 'Uploading…' : 'Choose image'}
        </DsButton>
        {onGenerateImage ? (
          <DsButton
            variant="ghost"
            size="sm"
            accessibilityLabel="Generate image with AI"
            borderWidth={1}
            borderColor="$primary"
            backgroundColor="$surface"
            disabled={imageBusy || !canGenerateImage}
            onPress={() => {
              void onGenerateImage();
            }}
          >
            {imageGenerating ? 'Generating…' : 'Generate with AI'}
          </DsButton>
        ) : null}
        {imagePreview ? (
          <DsButton
            variant="secondary"
            size="sm"
            onPress={onRemove}
          >
            Remove image
          </DsButton>
        ) : null}
      </XStack>
      {imageError ? (
        <DsText
          variant="error"
          marginBlockStart="$2"
        >
          {imageError}
        </DsText>
      ) : null}
    </YStack>
  );
};
