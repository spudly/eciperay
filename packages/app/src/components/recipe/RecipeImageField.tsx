/* eslint-disable max-lines -- recipe image upload, paste, and generate controls */
import {tokens} from '@spudly/ui';
import React from 'react';
import {Image, View} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import {Text, XStack, YStack} from 'tamagui';

import {
  recipeImageFromAsset,
  type PendingRecipeImage,
} from '../../lib/recipeImageAsset';
import {
  confirmPhotoLibraryAccess,
  ensureCameraPermission,
} from '../../lib/androidPermissions';

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

/**
 * The field's small action buttons, re-expressed host-side (@spudly/ui 6.x is
 * pages-only, so the DS Button no longer crosses the package boundary): the DS
 * Button's small geometry (md radius, sm semibold text, spacing 3/2 padding,
 * 1px border on the filled variants, half opacity while disabled) with the
 * variant treatments the field used — primary ($primary fill, $onPrimary ink),
 * secondary (gray-3 fill, gray-10 ink and border), and the generate action's
 * ghost form (surface fill, primary border and ink, from the overrides the
 * field passed).
 */
const FieldButton = ({
  label,
  accessibilityLabel,
  variant,
  disabled = false,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  variant: 'primary' | 'secondary' | 'generate';
  disabled?: boolean;
  onPress: () => void;
}) => {
  const treatment =
    variant === 'primary'
      ? {
          backgroundColor: '$primary' as const,
          borderColor: 'transparent' as const,
          color: '$onPrimary' as const,
        }
      : variant === 'secondary'
        ? {
            backgroundColor: tokens.colors.gray.gray3,
            borderColor: tokens.colors.gray.gray10,
            color: tokens.colors.gray.gray10,
          }
        : {
            backgroundColor: '$surface' as const,
            borderColor: '$primary' as const,
            color: '$primary' as const,
          };
  return (
    <YStack
      backgroundColor={treatment.backgroundColor}
      borderWidth={1}
      borderColor={treatment.borderColor}
      borderRadius={tokens.radii.md}
      paddingHorizontal={tokens.spacing[3]}
      paddingVertical={tokens.spacing[2]}
      alignItems="center"
      justifyContent="center"
      opacity={disabled ? 0.5 : 1}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{disabled}}
      onPress={disabled ? undefined : onPress}
      cursor="pointer"
    >
      <Text
        fontSize={tokens.typography.fontSize.sm}
        fontWeight={tokens.typography.fontWeight.semibold}
        color={treatment.color}
      >
        {label}
      </Text>
    </YStack>
  );
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

  const reportReadError = (error_: unknown) => {
    onImageError?.(
      error_ instanceof Error ? error_.message : 'Failed to read image',
    );
  };

  const handleResult = async (result: ImagePickerResponse) => {
    if (result.didCancel) {
      return;
    }
    if (result.errorCode) {
      onImageError?.(
        result.errorMessage ??
          (result.errorCode === 'camera_unavailable'
            ? 'Camera is unavailable on this device'
            : 'Failed to read image'),
      );
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
      reportReadError(error_);
    }
  };

  const handlePick = async () => {
    const confirmed = await confirmPhotoLibraryAccess();
    if (!confirmed) {
      return;
    }

    try {
      await handleResult(
        await launchImageLibrary({mediaType: 'photo', includeBase64: true}),
      );
    } catch (error_) {
      reportReadError(error_);
    }
  };

  const handleTakePhoto = async () => {
    const granted = await ensureCameraPermission();
    if (!granted) {
      return;
    }

    try {
      await handleResult(
        await launchCamera({mediaType: 'photo', includeBase64: true}),
      );
    } catch (error_) {
      reportReadError(error_);
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
        <Text
          fontSize={tokens.typography.fontSize.sm}
          fontWeight={tokens.typography.fontWeight.medium}
          color={tokens.colors.gray.gray8}
        >
          Recipe image
        </Text>
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
            <Text
              fontSize={tokens.typography.fontSize.sm}
              color="$textMuted"
              textAlign="center"
            >
              Take a photo, choose an image from your library, or generate one
              with AI
            </Text>
          </View>
        )}
      </YStack>
      <XStack
        flexWrap="wrap"
        gap="$3"
      >
        <FieldButton
          label={imageUploading ? 'Uploading…' : 'Choose image'}
          accessibilityLabel="Choose recipe image"
          variant="primary"
          disabled={imageBusy}
          onPress={() => {
            void handlePick();
          }}
        />
        <FieldButton
          label="Take photo"
          accessibilityLabel="Take photo of recipe"
          variant="secondary"
          disabled={imageBusy}
          onPress={() => {
            void handleTakePhoto();
          }}
        />
        {onGenerateImage ? (
          <FieldButton
            label={imageGenerating ? 'Generating…' : 'Generate with AI'}
            accessibilityLabel="Generate image with AI"
            variant="generate"
            disabled={imageBusy || !canGenerateImage}
            onPress={() => {
              void onGenerateImage();
            }}
          />
        ) : null}
        {imagePreview ? (
          <FieldButton
            label="Remove image"
            accessibilityLabel="Remove image"
            variant="secondary"
            onPress={onRemove}
          />
        ) : null}
      </XStack>
      {imageError ? (
        <Text
          fontSize={tokens.typography.fontSize.sm}
          color="$errorText"
          marginBlockStart="$2"
        >
          {imageError}
        </Text>
      ) : null}
    </YStack>
  );
};
