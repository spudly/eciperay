/* eslint-disable max-lines -- shared recipe form host with dynamic ingredient/instruction lists */
import {
  applyIngredientLinkProposal,
  compareVersionToParent,
  ensureIngredientRowKeys,
  ensureInstructionRowKeys,
  formIngredientLinkId,
  toggleIngredientReference,
  unreferencedFormIngredients,
  withInstructionReferences,
  withoutIngredientReference,
  parentListSummaryParts,
  formatParentScalarHint,
  formatParentTagNames,
  parentIngredientsInput,
  parentInstructionsInput,
  parentTagIds,
  queryKeys,
  revertVersionScalar,
  stripImageCacheKey,
  withImageCacheKey,
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
  RecipeVersionDetail,
} from '@eciperay/types';
import type {I18n} from '@lingui/core';
import {useLingui} from '@lingui/react';
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
import {Input, Text, XStack, YStack} from 'tamagui';

import {
  confirmPhotoLibraryAccess,
  ensureCameraPermission,
} from '../../lib/androidPermissions';
import {eciperay} from '../../lib/api';
import {
  deleteImagePreviewFile,
  isRecipeImageReadError,
  type PendingRecipeImage,
  recipeImageFromAsset,
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
import {createEmptyIngredientRow} from '../../components/recipe/SortableIngredientList';
import {createEmptyInstructionRow} from '../../components/recipe/SortableInstructionList';

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
 * page with the `image` data prop (B7 T3, eciperay#554: the DS RecipeImageView
 * renders the preview and action row from data; the picker invocation and the
 * pending-selection crop flow stay app-side in this host, per the #124
 * contract) and the sortable lists in its render slots (the drag lists stay
 * app-side). The screens wrap this host in the DS shell pages (EditRecipePage /
 * EditVersionPage / ManualEntryPage).
 */
/**
 * The parent-version list summary, composed from the catalog (#465): the client
 * helper supplies the structured counts/preview, and the prose — empty state,
 * count sentence, and overflow suffix — resolves through Lingui here, so only
 * the parent's own ingredient names / step text stay as entered.
 */
const parentListSummary = (
  i18n: I18n,
  parent: RecipeVersionDetail,
  list: 'ingredients' | 'instructions',
): string => {
  const parts = parentListSummaryParts(parent, list);
  if (parts.count === 0) {
    return list === 'ingredients'
      ? i18n._({
          id: 'recipeForm.parentNoIngredients',
          message: 'Parent had no ingredients',
        })
      : i18n._({
          id: 'recipeForm.parentNoSteps',
          message: 'Parent had no steps',
        });
  }
  const more =
    parts.overflowCount > 0
      ? i18n._({
          id: 'recipeForm.parentMoreSuffix',
          message: ' (+{count} more)',
          values: {count: parts.overflowCount},
        })
      : '';
  return list === 'ingredients'
    ? i18n._({
        id: 'recipeForm.parentIngredientsSummary',
        message: 'Parent had {count} ingredients: {preview}{more}',
        values: {count: parts.count, preview: parts.preview, more},
      })
    : i18n._({
        id: 'recipeForm.parentStepsSummary',
        message: 'Parent had {count} steps: {preview}{more}',
        values: {count: parts.count, preview: parts.preview, more},
      });
};

export const RecipeForm = ({
  initial,
  recipeId,
  parentVersion,
  contentLocked = false,
  submitLabel,
  onSubmit,
}: Props) => {
  const {i18n} = useLingui();
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
  // Tips (#635 tranche 2): the DS form page has no tips slot, so —
  // like the ingredient-links section below — the repeatable tips
  // editor is host-rendered and the list rides buildInput's normal
  // save path. Array order is display order.
  const [tips, setTips] = useState<string[]>(initial.tips ?? []);
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
  // Ingredient linking (#643 tranche 2c): the walk-through modal's
  // current step (null = closed) and the AI proposal call's state.
  // Links live on the instruction rows (ingredientReferences), so
  // they persist through buildInput's normal save path.
  const [linkingStepIndex, setLinkingStepIndex] = useState<number | null>(
    null,
  );
  const [aiLinking, setAiLinking] = useState(false);
  const [aiLinkError, setAiLinkError] = useState<string | null>(null);

  // The tags query lived in the TagPicker container before the
  // split; the DS page takes the options as view-models, so the
  // query moves here with the rest of the form's data.
  const {data: tags = [], isLoading: isLoadingTags} = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => eciperay.tags.list(),
  });
  const tagOptions = useMemo(
    () => tags.map(tag => ({value: tag.id, label: tag.name})),
    [tags],
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
      // The known missing-data failure resolves through the catalog
      // instead of its English message; unrelated errors keep theirs.
      isRecipeImageReadError(error_)
        ? i18n._({
            id: 'recipeForm.readImageError',
            message: 'Failed to read image',
          })
        : error_ instanceof Error
          ? error_.message
          : i18n._({
              id: 'recipeForm.readImageError',
              message: 'Failed to read image',
            }),
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
        i18n._({
          id: 'recipeForm.cropError',
          message:
            'Failed to crop image — try again or cancel to use the original.',
        }),
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
      // The picker's errorMessage is debug-only diagnostics, never
      // user-facing copy: select the catalog message from errorCode.
      setImageError(
        result.errorCode === 'camera_unavailable'
          ? i18n._({
              id: 'recipeForm.cameraUnavailable',
              message: 'Camera is unavailable on this device',
            })
          : i18n._({
              id: 'recipeForm.readImageError',
              message: 'Failed to read image',
            }),
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
      setImageError(
        i18n._({
          id: 'recipeForm.signInToUpload',
          message: 'Sign in to upload images',
        }),
      );
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
          error_ instanceof Error
            ? error_.message
            : i18n._({
                id: 'recipeForm.uploadImageError',
                message: 'Failed to upload image',
              }),
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
      setDescriptionError(
        i18n._({
          id: 'recipeForm.addTitleForDescription',
          message: 'Add a title before generating a description',
        }),
      );
      return;
    }
    if (!session?.user.id) {
      setDescriptionError(
        i18n._({
          id: 'recipeForm.signInForDescriptions',
          message: 'Sign in to generate descriptions',
        }),
      );
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
          : i18n._({
              id: 'recipeForm.generateDescriptionError',
              message: 'Failed to generate description',
            }),
      );
    } finally {
      setDescriptionGenerating(false);
    }
  };

  const handleGenerateImage = async () => {
    const trimmedTitle = title.trim();
    /* istanbul ignore next 3 -- generate button is disabled when title is empty */
    if (!trimmedTitle) {
      setImageError(
        i18n._({
          id: 'recipeForm.addTitleForImage',
          message: 'Add a title before generating an image',
        }),
      );
      return;
    }
    if (!session?.user.id) {
      setImageError(
        i18n._({
          id: 'recipeForm.signInForImages',
          message: 'Sign in to generate images',
        }),
      );
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
      const image: PendingRecipeImage = {base64: imageBase64, contentType};
      const preview = await writeBase64ImagePreview(imageBase64, contentType);
      await processImage(image, preview);
    } catch (error_) {
      setImageError(
        error_ instanceof Error
          ? error_.message
          : i18n._({
              id: 'recipeForm.generateImageError',
              message: 'Failed to generate image',
            }),
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

  const updateTip = (index: number, value: string) => {
    setTips(prev => prev.map((tip, i) => (i === index ? value : tip)));
  };

  const moveTip = (index: number, direction: -1 | 1) => {
    setTips(prev => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved as string);
      return next;
    });
  };

  const toggleInstructionIngredient = (
    instructionKey: string,
    ingredientId: string,
  ) => {
    const instruction = instructions.find(row => row.key === instructionKey);
    if (!instruction) {
      return;
    }
    setInstructions(
      withInstructionReferences(
        instructions,
        instructionKey,
        toggleIngredientReference(
          ingredients,
          instruction.ingredientReferences,
          ingredientId,
        ),
      ),
    );
  };

  const handleAiLinkIngredients = async () => {
    if (!recipeId) {
      return;
    }
    const linkableIngredients = ingredients.filter(
      ingredient => ingredient.name.trim().length > 0,
    );
    const linkableInstructions = instructions.filter(
      instruction => instruction.body.trim().length > 0,
    );
    if (linkableIngredients.length === 0 || linkableInstructions.length === 0) {
      setAiLinkError(
        i18n._({
          id: 'recipeForm.linkIngredientsNeedsContent',
          message:
            'Add ingredient names and step text before suggesting links.',
        }),
      );
      return;
    }
    setAiLinkError(null);
    setAiLinking(true);
    try {
      // The proposal is keyed by the IDs sent: instruction row keys
      // and ingredient link IDs, which applyIngredientLinkProposal
      // maps back onto the rows. Nothing is stored server-side — the
      // proposal lands in form state and persists on save.
      const proposal = await eciperay.ai.linkIngredients(recipeId, {
        ingredients: linkableIngredients.map(ingredient => ({
          id: formIngredientLinkId(ingredient),
          name: ingredient.name.trim(),
        })),
        instructions: linkableInstructions.map(instruction => ({
          id: instruction.key,
          body: instruction.body.trim(),
        })),
      });
      setInstructions(
        applyIngredientLinkProposal(ingredients, instructions, proposal),
      );
    } catch (error_) {
      setAiLinkError(
        error_ instanceof Error
          ? error_.message
          : i18n._({
              id: 'recipeForm.linkIngredientsError',
              message: 'Failed to suggest ingredient links',
            }),
      );
    } finally {
      setAiLinking(false);
    }
  };

  const buildInput = (): RecipeInput => ({
    title,
    description: description || null,
    servings: Number(servings),
    prepTimeMin: prepTimeMin === '' ? null : Number(prepTimeMin),
    cookTimeMin: cookTimeMin === '' ? null : Number(cookTimeMin),
    imageUrl: pendingImage ? null : stripImageCacheKey(imageUrl) || null,
    sourceUrl: sourceUrl || null,
    // Blank rows are editing scaffolding, never content: the server
    // normalizes the same way (trim + drop blanks) on every save path.
    tips: contentLocked
      ? (initial.tips ?? [])
      : tips.map(tip => tip.trim()).filter(tip => tip.length > 0),
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
    tips,
    ingredients,
    instructions,
    tagIds,
    pendingImage,
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
      setError(
        i18n._({
          id: 'recipeForm.pendingImageSaveError',
          message: 'Use, crop, or discard the selected image before saving.',
        }),
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(buildInput(), pendingImage ?? undefined);
    } catch (error_) {
      setError(
        error_ instanceof Error
          ? error_.message
          : i18n._({id: 'recipeForm.saveError', message: 'Failed to save'}),
      );
    } finally {
      setLoading(false);
    }
  };

  const imagePreview =
    previewUri ??
    (imageUrl && imageCacheKey > 0
      ? withImageCacheKey(imageUrl, imageCacheKey)
      : imageUrl);

  // Ingredient linking (#643 tranche 2c): the DS form page has no
  // slot for per-step linking, so — like the pending-image flow —
  // the linking section and its walk-through modal are host-rendered.
  // Hidden while content is locked (the form submits the initial
  // instructions untouched in that mode).
  const namedIngredients = ingredients.filter(
    ingredient => ingredient.name.trim().length > 0,
  );
  const unreferencedIngredients = contentLocked
    ? []
    : unreferencedFormIngredients(ingredients, instructions);
  const linkingInstruction =
    linkingStepIndex === null
      ? null
      : (instructions[linkingStepIndex] ?? null);
  const linkedIngredientNames = (instruction: FormInstructionRow): string[] =>
    (instruction.ingredientReferences ?? [])
      .map(
        id =>
          ingredients.find(
            ingredient => formIngredientLinkId(ingredient) === id,
          )?.name,
      )
      .filter((name): name is string => Boolean(name?.trim()));

  return (
    <>
      {contentLocked ? null : (
        <YStack
          padding="$4"
          gap="$2"
          backgroundColor="$surface"
        >
          <Text
            fontSize={tokens.typography.fontSize.md}
            fontWeight={tokens.typography.fontWeight.semibold}
            color={tokens.colors.gray.gray10}
          >
            {i18n._({
              id: 'recipeForm.ingredientLinksHeading',
              message: 'Ingredient links',
            })}
          </Text>
          <Text
            fontSize={tokens.typography.fontSize.sm}
            color={tokens.colors.gray.gray8}
          >
            {i18n._({
              id: 'recipeForm.ingredientLinksIntro',
              message:
                'Link each step to the ingredients it uses so cook mode can show only what a step needs.',
            })}
          </Text>
          {instructions.map((instruction, index) => {
            const names = linkedIngredientNames(instruction);
            return (
              <Text
                key={instruction.key}
                fontSize={tokens.typography.fontSize.sm}
                color={tokens.colors.gray.gray8}
              >
                {i18n._({
                  id: 'recipeForm.stepLinkSummary',
                  message: 'Step {step}: {names}',
                  values: {
                    step: index + 1,
                    names:
                      names.length > 0
                        ? names.join(', ')
                        : i18n._({
                            id: 'recipeForm.stepLinkNone',
                            message: 'no ingredients linked',
                          }),
                  },
                })}
              </Text>
            );
          })}
          {unreferencedIngredients.length > 0 ? (
            <Text
              fontSize={tokens.typography.fontSize.sm}
              color="$errorText"
            >
              {i18n._({
                id: 'recipeForm.unreferencedIngredientsWarning',
                message:
                  'Not linked to any step: {names}. Link them so cook mode does not miss them.',
                values: {
                  names: unreferencedIngredients
                    .map(ingredient => ingredient.name.trim())
                    .join(', '),
                },
              })}
            </Text>
          ) : null}
          {aiLinkError ? (
            <Text
              fontSize={tokens.typography.fontSize.sm}
              color="$errorText"
            >
              {aiLinkError}
            </Text>
          ) : null}
          <XStack
            flexWrap="wrap"
            gap="$3"
          >
            <FieldButton
              label={i18n._({
                id: 'recipeForm.linkIngredients',
                message: 'Link ingredients',
              })}
              accessibilityLabel={i18n._({
                id: 'recipeForm.linkIngredients',
                message: 'Link ingredients',
              })}
              variant="primary"
              disabled={
                namedIngredients.length === 0 || instructions.length === 0
              }
              onPress={() => {
                setLinkingStepIndex(0);
              }}
            />
            {recipeId ? (
              <FieldButton
                label={
                  aiLinking
                    ? i18n._({
                        id: 'recipeForm.suggestingLinks',
                        message: 'Suggesting links…',
                      })
                    : i18n._({
                        id: 'recipeForm.suggestLinksWithAi',
                        message: 'Suggest links with AI',
                      })
                }
                accessibilityLabel={i18n._({
                  id: 'recipeForm.suggestLinksWithAi',
                  message: 'Suggest links with AI',
                })}
                variant="secondary"
                disabled={aiLinking}
                onPress={() => {
                  void handleAiLinkIngredients();
                }}
              />
            ) : null}
          </XStack>
        </YStack>
      )}
      {contentLocked ? null : (
        <YStack
          padding="$4"
          gap="$2"
          backgroundColor="$surface"
        >
          <Text
            fontSize={tokens.typography.fontSize.md}
            fontWeight={tokens.typography.fontWeight.semibold}
            color={tokens.colors.gray.gray10}
          >
            {i18n._({
              id: 'recipeForm.tipsHeading',
              message: 'Tips',
            })}
          </Text>
          <Text
            fontSize={tokens.typography.fontSize.sm}
            color={tokens.colors.gray.gray8}
          >
            {i18n._({
              id: 'recipeForm.tipsIntro',
              message:
                'Short tips shown at the bottom of the recipe, in the order listed. Up to 10 tips, 280 characters each.',
            })}
          </Text>
          {tips.length === 0 ? (
            <Text
              fontSize={tokens.typography.fontSize.sm}
              color={tokens.colors.gray.gray8}
            >
              {i18n._({
                id: 'recipeForm.tipsEmpty',
                message: 'No tips yet.',
              })}
            </Text>
          ) : (
            tips.map((tip, index) => (
              <YStack
                key={index}
                gap="$2"
              >
                <Input
                  aria-label={i18n._({
                    id: 'recipeForm.tipFieldLabel',
                    message: 'Tip {position}',
                    values: {position: index + 1},
                  })}
                  value={tip}
                  maxLength={280}
                  onChangeText={value => {
                    updateTip(index, value);
                  }}
                  backgroundColor="$surface"
                  borderWidth={1}
                  borderColor="$textMuted"
                  borderRadius={tokens.radii.md}
                  paddingHorizontal={tokens.spacing[3]}
                  minHeight={44}
                  fontSize={tokens.typography.fontSize.md}
                  color="$color"
                />
                <XStack
                  flexWrap="wrap"
                  gap="$3"
                >
                  <FieldButton
                    label={i18n._({
                      id: 'recipeForm.moveTipUpLabel',
                      message: 'Move up',
                    })}
                    accessibilityLabel={i18n._({
                      id: 'recipeForm.moveTipUp',
                      message: 'Move tip {position} up',
                      values: {position: index + 1},
                    })}
                    variant="secondary"
                    disabled={index === 0}
                    onPress={() => {
                      moveTip(index, -1);
                    }}
                  />
                  <FieldButton
                    label={i18n._({
                      id: 'recipeForm.moveTipDownLabel',
                      message: 'Move down',
                    })}
                    accessibilityLabel={i18n._({
                      id: 'recipeForm.moveTipDown',
                      message: 'Move tip {position} down',
                      values: {position: index + 1},
                    })}
                    variant="secondary"
                    disabled={index === tips.length - 1}
                    onPress={() => {
                      moveTip(index, 1);
                    }}
                  />
                  <FieldButton
                    label={i18n._({
                      id: 'recipeForm.removeTipLabel',
                      message: 'Remove',
                    })}
                    accessibilityLabel={i18n._({
                      id: 'recipeForm.removeTip',
                      message: 'Remove tip {position}',
                      values: {position: index + 1},
                    })}
                    variant="secondary"
                    onPress={() => {
                      setTips(prev => prev.filter((_, i) => i !== index));
                    }}
                  />
                </XStack>
              </YStack>
            ))
          )}
          <XStack
            flexWrap="wrap"
            gap="$3"
          >
            <FieldButton
              label={i18n._({
                id: 'recipeForm.addTip',
                message: 'Add tip',
              })}
              accessibilityLabel={i18n._({
                id: 'recipeForm.addTip',
                message: 'Add tip',
              })}
              variant="primary"
              disabled={tips.length >= 10}
              onPress={() => {
                setTips(prev => [...prev, '']);
              }}
            />
          </XStack>
        </YStack>
      )}
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
              ingredientsChangedLabel: i18n._({
                id: 'recipeForm.ingredientsChanged',
                message: 'Ingredients changed from parent version ({summary})',
                values: {
                  summary: parentListSummary(
                    i18n,
                    parentVersion,
                    'ingredients',
                  ),
                },
              }),
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
              instructionsChangedLabel: i18n._({
                id: 'recipeForm.instructionsChanged',
                message: 'Instructions changed from parent version ({summary})',
                values: {
                  summary: parentListSummary(
                    i18n,
                    parentVersion,
                    'instructions',
                  ),
                },
              }),
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
        ingredients={{
          rows: ingredients.map(ingredient => ({
            key: ingredient.key,
            quantity:
              ingredient.quantity === null ? '' : String(ingredient.quantity),
            unit: ingredient.unit ?? '',
            name: ingredient.name,
          })),
          onFieldChange: (rowKey, field, value) => {
            const index = ingredients.findIndex(row => row.key === rowKey);
            if (index === -1) {
              return;
            }
            // Preserve the retired host row's fold: an emptied quantity
            // or unit crosses to the form state as null, never "".
            updateIngredient(
              index,
              field,
              value === '' && field !== 'name' ? null : value,
            );
          },
          onRemove: rowKey => {
            const removed = ingredients.find(row => row.key === rowKey);
            setIngredients(prev => prev.filter(row => row.key !== rowKey));
            if (removed) {
              // A removed ingredient's links go with it — a reference
              // to a row that no longer exists would dangle (#643).
              setInstructions(prev =>
                withoutIngredientReference(prev, formIngredientLinkId(removed)),
              );
            }
          },
          onAdd: () => {
            setIngredients(prev => [
              ...prev,
              createEmptyIngredientRow(prev.length),
            ]);
          },
          // DS 14 renders the list itself from this data prop (#683);
          // the host drag handle has no DraggableFlatList container to
          // bind to in this contract (the web host binds dnd-kit the
          // same way), so no renderDragHandle is passed on native —
          // drag reorder in the form is a DS follow-up.
        }}
        instructions={{
          rows: instructions.map(instruction => ({
            key: instruction.key,
            body: instruction.body,
          })),
          onBodyChange: (rowKey, value) => {
            const index = instructions.findIndex(row => row.key === rowKey);
            if (index !== -1) {
              updateInstruction(index, value);
            }
          },
          onRemove: rowKey => {
            setInstructions(prev => prev.filter(row => row.key !== rowKey));
          },
          onAdd: () => {
            setInstructions(prev => [
              ...prev,
              createEmptyInstructionRow(prev.length + 1),
            ]);
          },
        }}
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
            {i18n._({
              id: 'recipeForm.recipeImageTitle',
              message: 'Recipe image',
            })}
          </Text>
          {pendingAsset?.uri ? (
            <View style={recipeImagePreviewStyles.frame}>
              <Image
                accessibilityLabel={i18n._({
                  id: 'recipeForm.recipePreviewAlt',
                  message: 'Recipe preview',
                })}
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
              label={i18n._({id: 'recipeForm.useImage', message: 'Use image'})}
              accessibilityLabel={i18n._({
                id: 'recipeForm.useImage',
                message: 'Use image',
              })}
              variant="primary"
              onPress={acceptPendingImage}
            />
            {/* The app only offers crop once the picker asset's
              dimensions are known (canCrop), so crop rectangles are
              always in real pixels. */}
            {canCrop ? (
              <FieldButton
                label={i18n._({
                  id: 'recipeForm.cropImage',
                  message: 'Crop image',
                })}
                accessibilityLabel={i18n._({
                  id: 'recipeForm.cropImage',
                  message: 'Crop image',
                })}
                variant="secondary"
                onPress={openCrop}
              />
            ) : null}
            <FieldButton
              label={i18n._({id: 'recipeForm.discard', message: 'Discard'})}
              accessibilityLabel={i18n._({
                id: 'recipeForm.discardSelectedImage',
                message: 'Discard selected image',
              })}
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
            {i18n._({
              id: 'recipeForm.cropInstructionsNative',
              message:
                'Crop image — drag the box to move it, drag its corner to resize, or use the move and resize buttons.',
            })}
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
                accessibilityLabel={i18n._({
                  id: 'recipeForm.imageToCropAlt',
                  message: 'Image to crop',
                })}
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
                accessibilityLabel={i18n._({
                  id: 'recipeForm.cropAreaShort',
                  message: 'Crop area',
                })}
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
                  accessibilityLabel={i18n._({
                    id: 'recipeForm.resizeCropHandle',
                    message: 'Resize crop area handle',
                  })}
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
              label={i18n._({
                id: 'recipeForm.moveLeftLabel',
                message: '◀ Move',
              })}
              accessibilityLabel={i18n._({
                id: 'recipeForm.moveCropLeft',
                message: 'Move crop area left',
              })}
              variant="secondary"
              onPress={() => {
                nudgeCrop(-Math.round(pendingWidth * 0.05), 0);
              }}
            />
            <FieldButton
              label={i18n._({
                id: 'recipeForm.moveRightLabel',
                message: 'Move ▶',
              })}
              accessibilityLabel={i18n._({
                id: 'recipeForm.moveCropRight',
                message: 'Move crop area right',
              })}
              variant="secondary"
              onPress={() => {
                nudgeCrop(Math.round(pendingWidth * 0.05), 0);
              }}
            />
            <FieldButton
              label={i18n._({id: 'recipeForm.moveUpLabel', message: '▲ Move'})}
              accessibilityLabel={i18n._({
                id: 'recipeForm.moveCropUp',
                message: 'Move crop area up',
              })}
              variant="secondary"
              onPress={() => {
                nudgeCrop(0, -Math.round(pendingHeight * 0.05));
              }}
            />
            <FieldButton
              label={i18n._({
                id: 'recipeForm.moveDownLabel',
                message: 'Move ▼',
              })}
              accessibilityLabel={i18n._({
                id: 'recipeForm.moveCropDown',
                message: 'Move crop area down',
              })}
              variant="secondary"
              onPress={() => {
                nudgeCrop(0, Math.round(pendingHeight * 0.05));
              }}
            />
            <FieldButton
              label={i18n._({id: 'recipeForm.growLabel', message: 'Grow'})}
              accessibilityLabel={i18n._({
                id: 'recipeForm.growCrop',
                message: 'Grow crop area',
              })}
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
              label={i18n._({id: 'recipeForm.shrinkLabel', message: 'Shrink'})}
              accessibilityLabel={i18n._({
                id: 'recipeForm.shrinkCrop',
                message: 'Shrink crop area',
              })}
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
              label={
                cropBusy
                  ? i18n._({id: 'recipeForm.cropping', message: 'Cropping…'})
                  : i18n._({id: 'recipeForm.applyCrop', message: 'Apply crop'})
              }
              accessibilityLabel={i18n._({
                id: 'recipeForm.applyCrop',
                message: 'Apply crop',
              })}
              variant="primary"
              disabled={cropBusy}
              onPress={() => {
                void applyCrop();
              }}
            />
            <FieldButton
              label={i18n._({
                id: 'recipeForm.cancelCrop',
                message: 'Cancel crop',
              })}
              accessibilityLabel={i18n._({
                id: 'recipeForm.cancelCrop',
                message: 'Cancel crop',
              })}
              variant="secondary"
              disabled={cropBusy}
              onPress={cancelCrop}
            />
          </XStack>
        </YStack>
      </Modal>
      {/* The ingredient-linking walk-through (#643 tranche 2c):
        one step at a time, check the ingredients it uses, Next
        walks to the following step (Mealie's flow). Edits land on
        the instruction rows immediately and persist on save. */}
      <Modal
        visible={linkingInstruction !== null}
        animationType="slide"
        onRequestClose={() => {
          setLinkingStepIndex(null);
        }}
      >
        <YStack
          flex={1}
          padding="$4"
          gap="$3"
          backgroundColor="$surface"
        >
          <Text
            fontSize={tokens.typography.fontSize.md}
            fontWeight={tokens.typography.fontWeight.semibold}
            color={tokens.colors.gray.gray10}
          >
            {linkingStepIndex !== null
              ? i18n._({
                  id: 'recipeForm.linkStepHeading',
                  message: 'Step {step} of {total}',
                  values: {
                    step: linkingStepIndex + 1,
                    total: instructions.length,
                  },
                })
              : ''}
          </Text>
          <Text
            fontSize={tokens.typography.fontSize.sm}
            color={tokens.colors.gray.gray8}
          >
            {linkingInstruction?.body.trim() ||
              i18n._({
                id: 'recipeForm.linkStepNoText',
                message: '(This step has no text yet)',
              })}
          </Text>
          <Text
            fontSize={tokens.typography.fontSize.sm}
            fontWeight={tokens.typography.fontWeight.medium}
            color={tokens.colors.gray.gray8}
          >
            {i18n._({
              id: 'recipeForm.linkStepPrompt',
              message: 'Check the ingredients this step uses:',
            })}
          </Text>
          {linkingInstruction
            ? namedIngredients.map(ingredient => {
                const ingredientId = formIngredientLinkId(ingredient);
                const checked = (
                  linkingInstruction.ingredientReferences ?? []
                ).includes(ingredientId);
                return (
                  <YStack
                    key={ingredient.key}
                    paddingVertical={tokens.spacing[2]}
                    accessibilityRole="checkbox"
                    accessibilityLabel={ingredient.name.trim()}
                    accessibilityState={{checked}}
                    onPress={() => {
                      toggleInstructionIngredient(
                        linkingInstruction.key,
                        ingredientId,
                      );
                    }}
                    cursor="pointer"
                  >
                    <Text
                      fontSize={tokens.typography.fontSize.sm}
                      color={tokens.colors.gray.gray10}
                    >
                      {checked ? '☑ ' : '☐ '}
                      {ingredient.name.trim()}
                    </Text>
                  </YStack>
                );
              })
            : null}
          <XStack
            flexWrap="wrap"
            gap="$3"
          >
            <FieldButton
              label={i18n._({
                id: 'recipeForm.linkPreviousStep',
                message: 'Previous step',
              })}
              accessibilityLabel={i18n._({
                id: 'recipeForm.linkPreviousStep',
                message: 'Previous step',
              })}
              variant="secondary"
              disabled={linkingStepIndex === null || linkingStepIndex === 0}
              onPress={() => {
                if (linkingStepIndex !== null && linkingStepIndex > 0) {
                  setLinkingStepIndex(linkingStepIndex - 1);
                }
              }}
            />
            {linkingStepIndex !== null &&
            linkingStepIndex < instructions.length - 1 ? (
              <FieldButton
                label={i18n._({
                  id: 'recipeForm.linkNextStep',
                  message: 'Next step',
                })}
                accessibilityLabel={i18n._({
                  id: 'recipeForm.linkNextStep',
                  message: 'Next step',
                })}
                variant="primary"
                onPress={() => {
                  setLinkingStepIndex(linkingStepIndex + 1);
                }}
              />
            ) : null}
            <FieldButton
              label={i18n._({id: 'recipeForm.linkDone', message: 'Done'})}
              accessibilityLabel={i18n._({
                id: 'recipeForm.linkDone',
                message: 'Done',
              })}
              variant={
                linkingStepIndex !== null &&
                linkingStepIndex < instructions.length - 1
                  ? 'secondary'
                  : 'primary'
              }
              onPress={() => {
                setLinkingStepIndex(null);
              }}
            />
          </XStack>
        </YStack>
      </Modal>
    </>
  );
};
