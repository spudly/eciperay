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
  uploadRecipeImageFromBase64,
  useAuth,
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
import {RecipeFormPage, tokens, type RecipeFormPageField} from '@spudly/ui';
import {useQuery} from '@tanstack/react-query';
import React, {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Image, Modal, PanResponder, View} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import {Text, XStack, YStack} from 'tamagui';

import {
  confirmPhotoLibraryAccess,
  ensureCameraPermission,
} from '../../lib/androidPermissions';
import {api} from '../../lib/api';
import {
  deleteImagePreviewFile,
  type PendingRecipeImage,
  recipeImageFromAsset,
  stripImageCacheKey,
  withImageCacheKey,
  writeBase64ImagePreview,
} from '../../lib/recipeImageAsset';
import {
  cropPickedImage,
  defaultCropRect,
  moveCropRect,
  resizeCropRect,
  type CropRect,
} from '../../lib/recipeImageCrop';
import {supabase} from '../../lib/supabase';

import {recipeImagePreviewStyles} from '../../components/recipe/recipeImagePreviewStyles';
import {
  createEmptyIngredientRow,
  SortableIngredientList,
} from '../../components/recipe/SortableIngredientList';
import {
  createEmptyInstructionRow,
  SortableInstructionList,
} from '../../components/recipe/SortableInstructionList';

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

/**
 * The pending-flow's small action buttons, re-expressed host-side (the DS
 * Button geometry the retired RecipeImageField used: md radius, sm semibold
 * text, spacing 3/2 padding, 1px border on the filled variants, half opacity
 * while disabled) with its variant treatments — primary ($primary fill,
 * $onPrimary ink), secondary (gray-3 fill, gray-10 ink and border).
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
  variant: 'primary' | 'secondary';
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
      : {
          backgroundColor: tokens.colors.gray.gray3,
          borderColor: tokens.colors.gray.gray10,
          color: tokens.colors.gray.gray10,
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

type FormIngredient = FormIngredientRow & {quantity: number | string | null};

const toQuantity = (value: number | string | null): number | null => {
  if (value === null) {
    return null;
  }
  return typeof value === 'number' ? value : Number(value);
};

/**
 * App-side host for the design system's RecipeFormPage (#124, B3a): this
 * component owns everything the B2 audit leaves in the app — the form state,
 * the tags query, image processing and upload, the AI description/image calls,
 * parent-version diffing, and building the RecipeInput — and renders the DS
 * page with the `image` data prop (B7 T3, eciperay#554: the DS
 * RecipeImageView renders the preview and action row from data; the picker
 * invocation and the pending-selection crop flow stay app-side in this host,
 * per the #124 contract) and the sortable lists in its render slots (the drag
 * lists stay app-side). The screens wrap this host in the DS shell pages
 * (EditRecipePage / EditVersionPage / ManualEntryPage).
 */
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
  const [status, setStatus] = useState<RecipeStatus>(initial.status ?? 'idea');
  const [pendingImage, setPendingImage] = useState<PendingRecipeImage | null>(
    null,
  );
  // Crop step (#406): a picked asset becomes the pending selection
  // first. The user can crop it, use it as-is (skip), or discard it;
  // only then does the (possibly cropped) image flow into
  // processImage. A selection still pending blocks submit so it is
  // never silently dropped on save. This flow lived in the retired
  // RecipeImageField component; with the `image` data prop adoption
  // (B7 T3, #554) the DS view renders only the applied image, so the
  // pending flow is host-side here (the #124 contract).
  const [pendingAsset, setPendingAsset] = useState<Asset | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [cropBusy, setCropBusy] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  // Picker launches are serialized (#446): react-native-image-picker
  // stores a single native callback, so a second launch while one is
  // pending can steal or drop the first result. The ref guards the
  // whole permission-check + launch flow.
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
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imageCacheKey, setImageCacheKey] = useState(0);
  const [descriptionGenerating, setDescriptionGenerating] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  // The tags query lived in the TagPicker container before the
  // split; the DS page takes the options as view-models, so the
  // query moves here with the rest of the form's data.
  const {data: tags = [], isLoading: isLoadingTags} = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => api.tags.list(),
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
    setPreviewUri(current => {
      if (current) {
        void deleteImagePreviewFile(current);
      }
      return null;
    });
    setPendingImage(null);
  };

  const reportReadError = (error_: unknown) => {
    setImageError(
      error_ instanceof Error ? error_.message : 'Failed to read image',
    );
  };

  const pendingWidth = pendingAsset?.width ?? 0;
  const pendingHeight = pendingAsset?.height ?? 0;
  const canCrop = pendingWidth > 0 && pendingHeight > 0;
  const effectiveCropRect =
    cropRect ?? (canCrop ? defaultCropRect(pendingWidth, pendingHeight) : null);

  const clearPendingSelection = () => {
    setPendingAsset(null);
    setCropOpen(false);
    setCropRect(null);
    setCropError(null);
    setCropBusy(false);
  };

  /** Deliver an asset through the existing picked-image flow. */
  const deliverAsset = async (asset: Asset) => {
    const {uri} = asset;
    if (!uri) {
      return;
    }
    try {
      const image = recipeImageFromAsset(asset);
      await processImage(image, uri);
    } catch (error_) {
      reportReadError(error_);
    }
  };

  /** Skip: hand the original, uncropped asset to the upload flow. */
  const acceptPendingImage = () => {
    if (!pendingAsset?.uri) {
      return;
    }
    const asset = pendingAsset;
    clearPendingSelection();
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
      const asset: Asset = {
        uri: cropped.uri,
        base64: cropped.base64,
        type: cropped.contentType,
      };
      clearPendingSelection();
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
  // never write refs during render (a discarded render could leak a
  // value that was never committed).
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
    // While the crop overlay is open, a new pick must not replace the
    // pending asset or close the overlay before the user decides on
    // the crop (#446). Read the ref, not the state: this result can
    // arrive after a later pick has already opened the overlay, and
    // the closure's cropOpen is the stale value from the render that
    // launched this pick.
    if (result.didCancel || cropOpenRef.current) {
      return;
    }
    if (result.errorCode) {
      setImageError(
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
      // Validate eagerly so unreadable assets fail at pick time,
      // exactly as before; the validated payload is rebuilt when the
      // pending image is used or cropped.
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
    }
  };

  const handleTakePhoto = async () => {
    if (pickerInFlightRef.current) {
      return;
    }
    pickerInFlightRef.current = true;
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
    }
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

  // The diff crosses to the DS page as presentation data: which
  // fields changed (the page field names — imageUrl is the image
  // section's "image") and the pre-formatted parent-value hint for
  // each changed field's revert affordance.
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
    // Guard the save (Option 1 on #446): a selected image that is still
    // pending in the host's picker flow would otherwise be silently
    // dropped.
    if (pendingAsset) {
      setError('Use, crop, or discard the selected image before saving.');
      return;
    }
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
    <>
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
      loadingTags={isLoadingTags}
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
                ensureIngredientRowKeys(parentIngredientsInput(parentVersion)),
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
      image={{
        imagePreviewUri: imagePreview || null,
        isUploading: imageUploading,
        isGenerating: imageGenerating,
        error: imageError,
        canGenerateImage: title.trim().length > 0,
        onPickImageRequest: () => {
          void handlePick();
        },
        onTakePhotoRequest: () => {
          void handleTakePhoto();
        },
        onGenerateImageRequest: () => {
          void handleGenerateImage();
        },
        onRemoveImage: () => {
          clearPendingImage();
          setImageUrl('');
          setImageCacheKey(0);
          setImageError(null);
        },
      }}
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
    {/* The pending-selection flow (#406): a picked asset waits here
        for its use / crop / discard decision before it uploads. The
        DS image view never sees a pending selection. */}
    <Modal
      visible={pendingAsset !== null && !cropOpen}
      animationType="slide"
      onRequestClose={clearPendingSelection}
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
          Recipe image
        </Text>
        {pendingAsset?.uri ? (
          <View style={recipeImagePreviewStyles.frame}>
            <Image
              accessibilityLabel="Recipe preview"
              source={{uri: pendingAsset.uri}}
              resizeMode="contain"
              style={recipeImagePreviewStyles.image}
            />
          </View>
        ) : null}
        <XStack
          flexWrap="wrap"
          gap="$3"
        >
          <FieldButton
            label="Use image"
            accessibilityLabel="Use image"
            variant="primary"
            onPress={acceptPendingImage}
          />
          {/* The app only offers crop once the picker asset's
              dimensions are known (canCrop), so crop rectangles are
              always in real pixels. */}
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
            onPress={clearPendingSelection}
          />
        </XStack>
      </YStack>
    </Modal>
    <Modal
      visible={cropOpen && pendingAsset !== null}
      animationType="slide"
      onRequestClose={() => {
        // Guarded like the Cancel button: a back press mid-crop must
        // not deliver the original while applyCrop is still in flight,
        // or the picked image would be delivered twice.
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
    </>
  );
};
