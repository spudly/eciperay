/* eslint-disable max-lines -- recipe image upload, paste, and generate controls */
import {Button as DsButton, Text as DsText, tokens} from '@spudly/ui';
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {Image, Modal, PanResponder, View} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import {XStack, YStack} from 'tamagui';

import {
  recipeImageFromAsset,
  type PendingRecipeImage,
} from '../../lib/recipeImageAsset';
import {
  cropPickedImage,
  defaultCropRect,
  moveCropRect,
  resizeCropRect,
  type CropRect,
} from '../../lib/recipeImageCrop';
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
  /**
   * Reports whether a picked image is still pending (the user has not yet used,
   * cropped, or discarded it). The host guards its submit on this so a pending
   * selection is never silently dropped on save (#406).
   */
  onPendingChange?: (pending: boolean) => void;
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
  onPendingChange,
}: Props) => {
  const imageBusy = imageUploading || imageGenerating;

  // Crop step (#406): a picked asset becomes pending first. The user can
  // crop it, use it as-is (skip), or discard it; only then does the
  // (possibly cropped) image flow into onImagePicked.
  const [pendingAsset, setPendingAsset] = useState<Asset | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [cropBusy, setCropBusy] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const cropFrameSizeRef = useRef({width: 0, height: 0});
  const cropDragRef = useRef<{
    startRect: CropRect;
    mode: 'move' | 'resize';
  } | null>(null);
  // Latest crop state for the (stable) PanResponder callbacks below.
  const cropStateRef = useRef<{
    rect: CropRect | null;
    width: number;
    height: number;
  }>({rect: null, width: 0, height: 0});

  const reportReadError = (error_: unknown) => {
    onImageError?.(
      error_ instanceof Error ? error_.message : 'Failed to read image',
    );
  };

  const pendingWidth = pendingAsset?.width ?? 0;
  const pendingHeight = pendingAsset?.height ?? 0;
  const canCrop = pendingWidth > 0 && pendingHeight > 0;
  const effectiveCropRect =
    cropRect ?? (canCrop ? defaultCropRect(pendingWidth, pendingHeight) : null);

  const clearPending = () => {
    setPendingAsset(null);
    setCropOpen(false);
    setCropRect(null);
    setCropError(null);
    setCropBusy(false);
  };

  // Keep the host informed about the pending selection so it can guard
  // its submit (Option 1 on #446: no silent loss of a selected image).
  useEffect(() => {
    onPendingChange?.(pendingAsset !== null);
  }, [pendingAsset, onPendingChange]);

  /** Deliver an asset through the existing picked-image callback. */
  const deliverAsset = async (asset: Asset) => {
    const {uri} = asset;
    if (!uri) {
      return;
    }
    try {
      const image = recipeImageFromAsset(asset);
      await onImagePicked(image, uri);
    } catch (error_) {
      reportReadError(error_);
    }
  };

  /** Skip: hand the original, uncropped asset to the existing callback. */
  const acceptPendingImage = () => {
    if (!pendingAsset?.uri) {
      return;
    }
    const asset = pendingAsset;
    clearPending();
    void deliverAsset(asset);
  };

  const openCrop = () => {
    if (!canCrop) {
      return;
    }
    setCropRect(defaultCropRect(pendingWidth, pendingHeight));
    setCropError(null);
    setCropOpen(true);
  };

  /** Cancel inside the crop overlay also passes the original asset through. */
  const cancelCrop = () => {
    acceptPendingImage();
  };

  const applyCrop = async () => {
    if (!pendingAsset?.uri || !effectiveCropRect) {
      return;
    }
    setCropBusy(true);
    setCropError(null);
    try {
      const sourceType =
        pendingAsset.type === 'image/jpg'
          ? 'image/jpeg'
          : (pendingAsset.type ?? 'image/jpeg');
      const cropped = await cropPickedImage(
        pendingAsset.uri,
        effectiveCropRect,
        sourceType,
      );
      if (!cropped) {
        // Native crop is unavailable (expo-image-manipulator is not
        // registered until #453 wires Expo autolinking): fall back to the
        // uncropped image instead of failing (Option 3 on #446).
        acceptPendingImage();
        return;
      }
      const asset: Asset = {
        uri: cropped.uri,
        base64: cropped.base64,
        type: cropped.contentType,
      };
      clearPending();
      await deliverAsset(asset);
    } catch {
      setCropError(
        'Failed to crop image — try again or cancel to use the original.',
      );
      setCropBusy(false);
    }
  };

  const nudgeCrop = (deltaX: number, deltaY: number, resize = false) => {
    if (!effectiveCropRect || !canCrop) {
      return;
    }
    setCropRect(
      resize
        ? resizeCropRect(
            effectiveCropRect,
            deltaX,
            deltaY,
            pendingWidth,
            pendingHeight,
          )
        : moveCropRect(
            effectiveCropRect,
            deltaX,
            deltaY,
            pendingWidth,
            pendingHeight,
          ),
    );
  };

  // Keep the ref the PanResponder callbacks read in sync after commit —
  // never write refs during render (a discarded render could leak a value
  // that was never committed).
  useLayoutEffect(() => {
    cropStateRef.current = {
      rect: effectiveCropRect,
      width: pendingWidth,
      height: pendingHeight,
    };
  });

  const makeCropPanResponder = (mode: 'move' | 'resize') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const {rect} = cropStateRef.current;
        if (rect) {
          cropDragRef.current = {startRect: rect, mode};
        }
      },
      onPanResponderMove: (_event, gesture) => {
        const drag = cropDragRef.current;
        const frame = cropFrameSizeRef.current;
        const {width, height} = cropStateRef.current;
        if (!drag || frame.width === 0 || width === 0 || height === 0) {
          return;
        }
        const scaleX = width / frame.width;
        const scaleY = height / frame.height;
        setCropRect(
          drag.mode === 'move'
            ? moveCropRect(
                drag.startRect,
                gesture.dx * scaleX,
                gesture.dy * scaleY,
                width,
                height,
              )
            : resizeCropRect(
                drag.startRect,
                gesture.dx * scaleX,
                gesture.dy * scaleY,
                width,
                height,
              ),
        );
      },
      onPanResponderRelease: () => {
        cropDragRef.current = null;
      },
      onPanResponderTerminate: () => {
        cropDragRef.current = null;
      },
    });

  const movePanResponder = useRef(makeCropPanResponder('move')).current;
  const resizePanResponder = useRef(makeCropPanResponder('resize')).current;

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
      // Validate eagerly so unreadable assets fail at pick time, exactly as
      // before; the validated payload is rebuilt when the pending image is
      // used or cropped.
      recipeImageFromAsset(asset);
    } catch (error_) {
      reportReadError(error_);
      return;
    }
    setPendingAsset(asset);
    setCropRect(null);
    setCropError(null);
    setCropOpen(false);
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
        {(pendingAsset?.uri ?? imagePreview) ? (
          <View style={recipeImagePreviewStyles.frame}>
            <Image
              accessibilityLabel="Recipe preview"
              source={{uri: pendingAsset?.uri ?? imagePreview ?? ''}}
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
              Take a photo, choose an image from your library, or generate one
              with AI
            </DsText>
          </View>
        )}
      </YStack>
      <XStack
        flexWrap="wrap"
        gap="$3"
      >
        {pendingAsset ? (
          <>
            <DsButton
              variant="primary"
              size="sm"
              accessibilityLabel="Use image"
              onPress={acceptPendingImage}
            >
              Use image
            </DsButton>
            {/* Parity with the web mirror's dimensions gate: the app only
                offers crop once the picker asset's dimensions are known
                (canCrop), so crop rectangles are always in real pixels. */}
            {canCrop ? (
              <DsButton
                variant="secondary"
                size="sm"
                accessibilityLabel="Crop image"
                onPress={openCrop}
              >
                Crop image
              </DsButton>
            ) : null}
            <DsButton
              variant="secondary"
              size="sm"
              accessibilityLabel="Discard selected image"
              onPress={clearPending}
            >
              Discard
            </DsButton>
          </>
        ) : (
          <>
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
            <DsButton
              variant="secondary"
              size="sm"
              accessibilityLabel="Take photo of recipe"
              disabled={imageBusy}
              onPress={() => {
                void handleTakePhoto();
              }}
            >
              Take photo
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
          </>
        )}
      </XStack>
      {imageError ? (
        <DsText
          variant="error"
          marginBlockStart="$2"
        >
          {imageError}
        </DsText>
      ) : null}
      <Modal
        visible={cropOpen && pendingAsset !== null}
        animationType="slide"
        onRequestClose={() => {
          // Guarded like the Cancel button: a back press mid-crop must not
          // deliver the original while applyCrop is still in flight, or
          // onImagePicked would fire twice.
          if (!cropBusy) {
            cancelCrop();
          }
        }}
      >
        <YStack
          flex={1}
          padding="$4"
          gap="$3"
          backgroundColor="$surface"
        >
          <DsText
            fontSize={tokens.typography.fontSize.sm}
            fontWeight={tokens.typography.fontWeight.medium}
            color={tokens.colors.gray.gray8}
          >
            Crop image — drag the box to move it, drag its corner to resize, or
            use the move and resize buttons.
          </DsText>
          {pendingAsset?.uri && effectiveCropRect ? (
            <View
              onLayout={e => {
                cropFrameSizeRef.current = {
                  width: e.nativeEvent.layout.width,
                  height: e.nativeEvent.layout.height,
                };
              }}
              style={{
                width: '100%',
                aspectRatio:
                  pendingWidth > 0 && pendingHeight > 0
                    ? pendingWidth / pendingHeight
                    : 4 / 3,
                position: 'relative',
                backgroundColor: tokens.colors.gray.gray2,
              }}
            >
              <Image
                accessibilityLabel="Image to crop"
                source={{uri: pendingAsset.uri}}
                resizeMode="cover"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
              <View
                accessibilityLabel="Crop area"
                {...movePanResponder.panHandlers}
                style={{
                  position: 'absolute',
                  left: `${(effectiveCropRect.x / pendingWidth) * 100}%`,
                  top: `${(effectiveCropRect.y / pendingHeight) * 100}%`,
                  width: `${(effectiveCropRect.width / pendingWidth) * 100}%`,
                  height: `${(effectiveCropRect.height / pendingHeight) * 100}%`,
                  borderWidth: 2,
                  borderColor: tokens.colors.primary.primary7,
                }}
              >
                <View
                  accessibilityLabel="Resize crop area handle"
                  {...resizePanResponder.panHandlers}
                  style={{
                    position: 'absolute',
                    right: -10,
                    bottom: -10,
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    backgroundColor: tokens.colors.primary.primary7,
                  }}
                />
              </View>
            </View>
          ) : null}
          <XStack
            flexWrap="wrap"
            gap="$2"
          >
            <DsButton
              variant="secondary"
              size="sm"
              accessibilityLabel="Move crop area left"
              onPress={() => {
                nudgeCrop(-Math.round(pendingWidth * 0.05), 0);
              }}
            >
              ◀ Move
            </DsButton>
            <DsButton
              variant="secondary"
              size="sm"
              accessibilityLabel="Move crop area right"
              onPress={() => {
                nudgeCrop(Math.round(pendingWidth * 0.05), 0);
              }}
            >
              Move ▶
            </DsButton>
            <DsButton
              variant="secondary"
              size="sm"
              accessibilityLabel="Move crop area up"
              onPress={() => {
                nudgeCrop(0, -Math.round(pendingHeight * 0.05));
              }}
            >
              ▲ Move
            </DsButton>
            <DsButton
              variant="secondary"
              size="sm"
              accessibilityLabel="Move crop area down"
              onPress={() => {
                nudgeCrop(0, Math.round(pendingHeight * 0.05));
              }}
            >
              Move ▼
            </DsButton>
            <DsButton
              variant="secondary"
              size="sm"
              accessibilityLabel="Grow crop area"
              onPress={() => {
                nudgeCrop(
                  Math.round(pendingWidth * 0.05),
                  Math.round(pendingHeight * 0.05),
                  true,
                );
              }}
            >
              Grow
            </DsButton>
            <DsButton
              variant="secondary"
              size="sm"
              accessibilityLabel="Shrink crop area"
              onPress={() => {
                nudgeCrop(
                  -Math.round(pendingWidth * 0.05),
                  -Math.round(pendingHeight * 0.05),
                  true,
                );
              }}
            >
              Shrink
            </DsButton>
          </XStack>
          {cropError ? <DsText variant="error">{cropError}</DsText> : null}
          <XStack
            flexWrap="wrap"
            gap="$3"
          >
            <DsButton
              variant="primary"
              size="sm"
              accessibilityLabel="Apply crop"
              disabled={cropBusy}
              onPress={() => {
                void applyCrop();
              }}
            >
              {cropBusy ? 'Cropping…' : 'Apply crop'}
            </DsButton>
            <DsButton
              variant="secondary"
              size="sm"
              accessibilityLabel="Cancel crop"
              disabled={cropBusy}
              onPress={cancelCrop}
            >
              Cancel crop
            </DsButton>
          </XStack>
        </YStack>
      </Modal>
    </YStack>
  );
};
