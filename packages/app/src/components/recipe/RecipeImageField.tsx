/* eslint-disable max-lines -- recipe image upload, paste, and generate controls */
import {tokens} from '@spudly/ui';
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {Image, Modal, PanResponder, View} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import {Text, XStack, YStack} from 'tamagui';

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
  // Picker launches are serialized (#446): react-native-image-picker
  // stores a single native callback, so a second launch while one is
  // pending can steal or drop the first result. The ref guards the
  // whole permission-check + launch flow; the state disables the
  // picker controls while a launch is in flight.
  const [pickerBusy, setPickerBusy] = useState(false);
  const pickerInFlightRef = useRef(false);
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
  // Whether the crop overlay is open, readable at picker-result time:
  // an async pick captures the cropOpen of the render that launched
  // it, which can be stale by the time its result arrives (#446).
  const cropOpenRef = useRef(false);

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

  // Parity note (#446): the web mirror also stages files handed in from
  // outside the field (stagedFile, for the host's form-wide paste). There
  // is no native equivalent — images here arrive only through the picker
  // or camera, which already stage as pending above — so the app field
  // has no stagedFile prop.

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
    cropOpenRef.current = cropOpen;
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
    // Parity with the web mirror (#446): while the crop overlay is
    // open, a new pick must not replace the pending asset or close
    // the overlay before the user decides on the crop. Read the ref,
    // not the state: this result can arrive after a later pick has
    // already opened the overlay, and the closure's cropOpen is the
    // stale value from the render that launched this pick.
    if (result.didCancel || cropOpenRef.current) {
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
    if (pickerInFlightRef.current) {
      return;
    }
    pickerInFlightRef.current = true;
    setPickerBusy(true);
    try {
      const confirmed = await confirmPhotoLibraryAccess();
      if (!confirmed) {
        return;
      }
      await handleResult(
        await launchImageLibrary({mediaType: 'photo', includeBase64: true}),
      );
    } catch (error_) {
      reportReadError(error_);
    } finally {
      pickerInFlightRef.current = false;
      setPickerBusy(false);
    }
  };

  const handleTakePhoto = async () => {
    if (pickerInFlightRef.current) {
      return;
    }
    pickerInFlightRef.current = true;
    setPickerBusy(true);
    try {
      const granted = await ensureCameraPermission();
      if (!granted) {
        return;
      }
      await handleResult(
        await launchCamera({mediaType: 'photo', includeBase64: true}),
      );
    } catch (error_) {
      reportReadError(error_);
    } finally {
      pickerInFlightRef.current = false;
      setPickerBusy(false);
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
        {pendingAsset ? (
          <>
            <FieldButton
              label="Use image"
              accessibilityLabel="Use image"
              variant="primary"
              onPress={acceptPendingImage}
            />
            {/* Parity with the web mirror's dimensions gate: the app only
                offers crop once the picker asset's dimensions are known
                (canCrop), so crop rectangles are always in real pixels. */}
            {canCrop ? (
              <FieldButton
                label="Crop image"
                accessibilityLabel="Crop image"
                variant="secondary"
                onPress={openCrop}
              />
            ) : null}
            <FieldButton
              label="Discard"
              accessibilityLabel="Discard selected image"
              variant="secondary"
              onPress={clearPending}
            />
          </>
        ) : (
          <>
            <FieldButton
              label={imageUploading ? 'Uploading…' : 'Choose image'}
              accessibilityLabel="Choose recipe image"
              variant="primary"
              disabled={imageBusy || pickerBusy}
              onPress={() => {
                void handlePick();
              }}
            />
            <FieldButton
              label="Take photo"
              accessibilityLabel="Take photo of recipe"
              variant="secondary"
              disabled={imageBusy || pickerBusy}
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
          </>
        )}
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
          <Text
            fontSize={tokens.typography.fontSize.sm}
            fontWeight={tokens.typography.fontWeight.medium}
            color={tokens.colors.gray.gray8}
          >
            Crop image — drag the box to move it, drag its corner to resize, or
            use the move and resize buttons.
          </Text>
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
            <FieldButton
              label="◀ Move"
              accessibilityLabel="Move crop area left"
              variant="secondary"
              onPress={() => {
                nudgeCrop(-Math.round(pendingWidth * 0.05), 0);
              }}
            />
            <FieldButton
              label="Move ▶"
              accessibilityLabel="Move crop area right"
              variant="secondary"
              onPress={() => {
                nudgeCrop(Math.round(pendingWidth * 0.05), 0);
              }}
            />
            <FieldButton
              label="▲ Move"
              accessibilityLabel="Move crop area up"
              variant="secondary"
              onPress={() => {
                nudgeCrop(0, -Math.round(pendingHeight * 0.05));
              }}
            />
            <FieldButton
              label="Move ▼"
              accessibilityLabel="Move crop area down"
              variant="secondary"
              onPress={() => {
                nudgeCrop(0, Math.round(pendingHeight * 0.05));
              }}
            />
            <FieldButton
              label="Grow"
              accessibilityLabel="Grow crop area"
              variant="secondary"
              onPress={() => {
                nudgeCrop(
                  Math.round(pendingWidth * 0.05),
                  Math.round(pendingHeight * 0.05),
                  true,
                );
              }}
            />
            <FieldButton
              label="Shrink"
              accessibilityLabel="Shrink crop area"
              variant="secondary"
              onPress={() => {
                nudgeCrop(
                  -Math.round(pendingWidth * 0.05),
                  -Math.round(pendingHeight * 0.05),
                  true,
                );
              }}
            />
          </XStack>
          {cropError ? (
            <Text
              fontSize={tokens.typography.fontSize.sm}
              color="$errorText"
            >
              {cropError}
            </Text>
          ) : null}
          <XStack
            flexWrap="wrap"
            gap="$3"
          >
            <FieldButton
              label={cropBusy ? 'Cropping…' : 'Apply crop'}
              accessibilityLabel="Apply crop"
              variant="primary"
              disabled={cropBusy}
              onPress={() => {
                void applyCrop();
              }}
            />
            <FieldButton
              label="Cancel crop"
              accessibilityLabel="Cancel crop"
              variant="secondary"
              disabled={cropBusy}
              onPress={cancelCrop}
            />
          </XStack>
        </YStack>
      </Modal>
    </YStack>
  );
};
