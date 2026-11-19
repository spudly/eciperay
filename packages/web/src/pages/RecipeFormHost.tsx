/* eslint-disable max-lines -- shared recipe form host with dynamic ingredient/instruction lists */
import {
  compareVersionToParent,
  createFormRowKey,
  ensureIngredientRowKeys,
  ensureInstructionRowKeys,
  parentListSummaryParts,
  formatParentScalarHint,
  formatParentTagNames,
  parentIngredientsInput,
  parentInstructionsInput,
  parentTagIds,
  queryKeys,
  recipeStatusOptions,
  revertVersionScalar,
  toRecipeInputIngredients,
  toRecipeInputInstructions,
  uploadRecipeImage,
  useAuth,
  validateRecipeImageFile,
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
import type {I18n} from '@lingui/core';
import {useLingui} from '@lingui/react';
import {
  eciperayTheme,
  RecipeFormPage,
  tokens,
  type RecipeFormPageField,
} from '@spudly/ui';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {useQuery} from '@tanstack/react-query';
import {useEffect, useMemo, useRef, useState} from 'react';

import {eciperay} from '../lib/api.js';
import {imageBase64ToFile} from '../lib/imageBase64ToFile.js';
import {
  clampCropRect,
  cropImageFile,
  defaultCropRect,
  moveCropRect,
  resizeCropRect,
  type CropRect,
} from '../lib/recipeImageCrop.js';
import {
  getImageFileFromDataTransfer,
  shouldIgnoreImagePaste,
} from '../lib/recipeImageInput.js';
import {
  stripImageCacheKey,
  withImageCacheKey,
} from '../lib/recipeImagePreviewUrl.js';
import {supabase} from '../lib/supabase.js';

import {SortableDragHandle} from '../components/recipe/SortableDragHandle.js';
import {handleKeyedDragEnd} from '../components/recipe/sortableDrag.js';

// Empty-row factories (minted host-side: the host owns row keys
// and shape defaults — the DS list views' add intent is bare).
const createEmptyIngredientRow = (sortOrder: number): FormIngredientRow => ({
  key: createFormRowKey(),
  sortOrder,
  name: '',
  quantity: null,
  unit: null,
  notes: null,
  isOptional: false,
});

const createEmptyInstructionRow = (stepNumber: number): FormInstructionRow => ({
  key: createFormRowKey(),
  stepNumber,
  body: '',
});

type Props = {
  initial: RecipeFormInitial;
  recipeId?: string;
  parentVersion?: RecipeVersionDetail;
  contentLocked?: boolean;
  submitLabel: string;
  onSubmit: (input: RecipeInput, pendingImage?: File) => Promise<void>;
};

type FormIngredient = FormIngredientRow & {quantity: number | string | null};

const toQuantity = (value: number | string | null): number | null => {
  if (value === null) {
    return null;
  }
  return typeof value === 'number' ? value : Number(value);
};

/**
 * Web-side host for the design system's RecipeFormPage (design-system#124, B3a;
 * web adoption B7 cluster C8): this component owns everything the B2 audit
 * leaves in the app — the form state, the tags query, image processing and
 * upload, the AI description/image calls, parent-version diffing, and building
 * the RecipeInput — and renders the DS page with the `image` data prop (B7 T3,
 * eciperay#554: the DS RecipeImageView renders the preview and action row from
 * data; the picker invocation, the pending-selection crop flow, and paste /
 * drop staging stay web-side in this host, per the #124 contract) and the
 * `ingredients` / `instructions` data props (B7 T5, eciperay#555: the DS list
 * views render the rows and list chrome from data; the dnd-kit drag container
 * stays web-side per Stephen's 2026-11-09 boundary on design-system#130 — one
 * DndContext wraps the page, each row's sortable activator binds through the
 * views' renderDragHandle as SortableDragHandle, and a drag-end crosses back to
 * the owning list as a new rows array via sortableDrag.ts). The route pages
 * wrap this host in the DS shell pages (EditRecipePage / EditVersionPage /
 * ManualEntryPage).
 */
/**
 * The parent-version list summary, composed from the catalog (#465): the
 * client helper supplies the structured counts/preview, and the prose —
 * empty state, count sentence, and overflow suffix — resolves through
 * Lingui here, so only the parent's own ingredient names / step text
 * stay as entered.
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

export const RecipeFormHost = ({
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
  const [status, setStatus] = useState<RecipeStatus>(initial.status ?? 'idea');
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  // Crop step (#406): a picked file becomes the pending selection first.
  // The user can crop it, use it as-is (skip), or discard it; only then
  // does the (possibly cropped) file flow into processImageFile. A
  // selection still pending blocks submit so it is never silently
  // dropped on save. This flow lived in the retired RecipeImageField
  // component; with the `image` data prop adoption (B7 T3, #554) the
  // DS view renders only the applied image, so the pending flow is
  // host-side here (the #124 contract: the host owns its picker flow).
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(
    null,
  );
  const [naturalSize, setNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [cropBusy, setCropBusy] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const browseInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);
  // The pending preview's object URL, owned outside React state so its
  // create/revoke never runs inside a state updater (Strict Mode
  // invokes updaters twice, which would leak one URL per selection).
  const pendingPreviewUrlRef = useRef<string | null>(null);
  const dragStateRef = useRef<{
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    startRect: CropRect;
  } | null>(null);
  // A form-wide paste hands its file to the pending flow for staging
  // (staging clears it once the file is actually staged).
  const [stagedPasteFile, setStagedPasteFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [imageCacheKey, setImageCacheKey] = useState(0);
  const [descriptionGenerating, setDescriptionGenerating] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  // The tags query lived in the TagPicker container before the split;
  // the DS page takes the options as view-models, so the query moves
  // here with the rest of the form's data (the app host's pattern).
  const {data: tags = [], isLoading: isLoadingTags} = useQuery({
    queryKey: queryKeys.tags(),
    queryFn: () => eciperay.tags.list(),
  });
  const tagOptions = useMemo(
    () => tags.map(tag => ({value: tag.id, label: tag.name})),
    [tags],
  );
  const statusOptions = useMemo(
    () =>
      recipeStatusOptions({
        idea: i18n._({id: 'recipeStatus.idea', message: 'Idea'}),
        evolving: i18n._({id: 'recipeStatus.evolving', message: 'Evolving'}),
        perfected: i18n._({id: 'recipeStatus.perfected', message: 'Perfected'}),
        abandoned: i18n._({id: 'recipeStatus.abandoned', message: 'Abandoned'}),
      }),
    [i18n],
  );

  const clearPendingImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPendingImageFile(null);
  };

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl],
  );

  const imageBusy = imageUploading || imageGenerating;
  // Until the browser reports the real dimensions, assume a 4:3 frame
  // so the default crop box is still sensible.
  const effectiveNaturalSize = naturalSize ?? {width: 1200, height: 900};
  const effectiveCropRect =
    cropRect ??
    defaultCropRect(effectiveNaturalSize.width, effectiveNaturalSize.height);

  const clearPendingSelection = () => {
    setPendingFile(null);
    if (pendingPreviewUrlRef.current) {
      URL.revokeObjectURL(pendingPreviewUrlRef.current);
      pendingPreviewUrlRef.current = null;
    }
    setPendingPreviewUrl(null);
    setNaturalSize(null);
    setCropOpen(false);
    setCropRect(null);
    setCropError(null);
    setCropBusy(false);
    setPreviewError(null);
  };

  /** Stage a file as the pending selection; false when refused. */
  const acceptImage = (file: File | null): boolean => {
    // Also refuse while the crop dialog is open: a paste or drop must
    // not replace the pending image or close the dialog before the
    // user decides on the crop (#446).
    if (!file || imageBusy || cropOpen) {
      return false;
    }
    setPendingFile(file);
    if (pendingPreviewUrlRef.current) {
      URL.revokeObjectURL(pendingPreviewUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    pendingPreviewUrlRef.current = url;
    setPendingPreviewUrl(url);
    setNaturalSize(null);
    setCropRect(null);
    setCropError(null);
    setCropOpen(false);
    setPreviewError(null);
    return true;
  };

  // Stage a file handed in from outside the image section (form-wide
  // paste) through the same pending flow as a browse/drop selection.
  // Acknowledge the file ONLY once it is actually staged: when
  // acceptImage refuses it (busy, or the crop dialog is open), the
  // host keeps it and this effect retries on a later render, so the
  // file is never silently dropped (#446).
  useEffect(() => {
    if (stagedPasteFile && acceptImage(stagedPasteFile)) {
      setStagedPasteFile(null);
    }
    // acceptImage is rebuilt per render; the staged file and the
    // gates that can refuse it are the real retry triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- staged-file retry
  }, [stagedPasteFile, imageBusy, cropOpen, pendingFile]);

  /** Skip: hand the original, uncropped file to the upload flow. */
  const acceptPendingImage = () => {
    if (!pendingFile) {
      return;
    }
    const file = pendingFile;
    clearPendingSelection();
    void processImageFile(file);
  };

  const openCrop = () => {
    setCropRect(
      defaultCropRect(effectiveNaturalSize.width, effectiveNaturalSize.height),
    );
    setCropError(null);
    setCropOpen(true);
  };

  /** Cancel inside the crop dialog also passes the original file through. */
  const cancelCrop = () => {
    acceptPendingImage();
  };

  const applyCrop = async () => {
    if (!pendingFile) {
      return;
    }
    setCropBusy(true);
    setCropError(null);
    try {
      const cropped = await cropImageFile(pendingFile, effectiveCropRect);
      clearPendingSelection();
      void processImageFile(cropped);
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

  const handlePendingImageLoad = (
    e: React.SyntheticEvent<HTMLImageElement>,
  ) => {
    setPreviewError(null);
    const {naturalWidth, naturalHeight} = e.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) {
      setNaturalSize({width: naturalWidth, height: naturalHeight});
      setCropRect(previous =>
        previous
          ? clampCropRect(previous, naturalWidth, naturalHeight)
          : defaultCropRect(naturalWidth, naturalHeight),
      );
    }
  };

  // A selected image that cannot decode never fires load, which would
  // otherwise leave Crop disabled with no explanation.
  const handlePendingPreviewError = () => {
    setPreviewError(
      i18n._({
        id: 'recipeForm.previewLoadError',
        message:
          'That image could not be loaded — discard it and choose a different image.',
      }),
    );
  };

  useEffect(() => {
    if (cropOpen) {
      cropBoxRef.current?.focus();
    }
  }, [cropOpen]);

  // Revoke the pending preview URL if the host unmounts mid-selection.
  useEffect(
    () => () => {
      if (pendingPreviewUrlRef.current) {
        URL.revokeObjectURL(pendingPreviewUrlRef.current);
        pendingPreviewUrlRef.current = null;
      }
    },
    [],
  );

  const cropBoxPercent = {
    left: `${(effectiveCropRect.x / effectiveNaturalSize.width) * 100}%`,
    top: `${(effectiveCropRect.y / effectiveNaturalSize.height) * 100}%`,
    width: `${(effectiveCropRect.width / effectiveNaturalSize.width) * 100}%`,
    height: `${(effectiveCropRect.height / effectiveNaturalSize.height) * 100}%`,
  };

  const handleCropPointerDown =
    (mode: 'move' | 'resize') => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragStateRef.current = {
        mode,
        startX: e.clientX,
        startY: e.clientY,
        startRect: effectiveCropRect,
      };
    };

  const handleCropPointerMove = (e: React.PointerEvent) => {
    const drag = dragStateRef.current;
    const displayed = cropImageRef.current;
    if (!drag || !displayed || displayed.clientWidth === 0) {
      return;
    }
    const scaleX = effectiveNaturalSize.width / displayed.clientWidth;
    const scaleY = effectiveNaturalSize.height / displayed.clientHeight;
    const deltaX = (e.clientX - drag.startX) * scaleX;
    const deltaY = (e.clientY - drag.startY) * scaleY;
    setCropRect(
      drag.mode === 'move'
        ? moveCropRect(
            drag.startRect,
            deltaX,
            deltaY,
            effectiveNaturalSize.width,
            effectiveNaturalSize.height,
          )
        : resizeCropRect(
            drag.startRect,
            deltaX,
            deltaY,
            effectiveNaturalSize.width,
            effectiveNaturalSize.height,
          ),
    );
  };

  const handleCropPointerUp = () => {
    dragStateRef.current = null;
  };

  const handleCropBoxKeyDown = (e: React.KeyboardEvent) => {
    const stepX = Math.max(1, Math.round(effectiveNaturalSize.width * 0.02));
    const stepY = Math.max(1, Math.round(effectiveNaturalSize.height * 0.02));
    const deltaByKey: Record<string, {x: number; y: number}> = {
      ArrowLeft: {x: -stepX, y: 0},
      ArrowRight: {x: stepX, y: 0},
      ArrowUp: {x: 0, y: -stepY},
      ArrowDown: {x: 0, y: stepY},
    };
    const delta = deltaByKey[e.key];
    if (!delta) {
      return;
    }
    e.preventDefault();
    setCropRect(
      e.shiftKey
        ? resizeCropRect(
            effectiveCropRect,
            delta.x,
            delta.y,
            effectiveNaturalSize.width,
            effectiveNaturalSize.height,
          )
        : moveCropRect(
            effectiveCropRect,
            delta.x,
            delta.y,
            effectiveNaturalSize.width,
            effectiveNaturalSize.height,
          ),
    );
  };

  const processImageFile = async (file: File) => {
    const userId = session?.user.id;
    if (!userId) {
      setImageError(
        i18n._({id: 'recipeForm.signInToUpload', message: 'Sign in to upload images'}),
      );
      return;
    }
    setImageError(null);
    try {
      validateRecipeImageFile(file);
    } catch (error_) {
      setImageError(
        error_ instanceof Error
          ? error_.message
          : i18n._({id: 'recipeForm.readImageError', message: 'Failed to read image'}),
      );
      return;
    }

    if (recipeId) {
      setImageUploading(true);
      try {
        clearPendingImage();
        setImageUrl(
          stripImageCacheKey(
            await uploadRecipeImage(supabase, file, userId, recipeId),
          ),
        );
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
    setPendingImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleGenerateDescription = async () => {
    const trimmedTitle = title.trim();
    /* c8 ignore next 4 -- generate button is disabled when title is empty */
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
    /* c8 ignore next 4 -- generate button is disabled when title is empty */
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
      const extension = contentType === 'image/jpeg' ? 'jpg' : 'png';
      await processImageFile(
        imageBase64ToFile(imageBase64, contentType, `recipe.${extension}`),
      );
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

  const handleFormPaste = (e: React.ClipboardEvent) => {
    // Skip pastes while an image operation is already running, and
    // pastes into text fields (the user is pasting text, not an image).
    if (
      e.defaultPrevented ||
      imageUploading ||
      imageGenerating ||
      shouldIgnoreImagePaste(e.target)
    ) {
      return;
    }
    const file = getImageFileFromDataTransfer(e.clipboardData);
    if (!file) {
      return;
    }
    e.preventDefault();
    // Stage the paste in the pending flow instead of processing it
    // here: a form-wide paste gets the same use/crop decision as any
    // other selection, so it can never bypass the pending step (#406).
    setStagedPasteFile(file);
  };

  const handleFormDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // A drop anywhere on the form stages through the same pending
    // flow (the retired field's drop zone is gone with the DS view's
    // preview frame); acceptImage refuses while busy or cropping.
    acceptImage(getImageFileFromDataTransfer(e.dataTransfer));
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

  // One drag container for both lists (B7 T5): the DS page
  // renders both list views, so a single DndContext wraps the
  // page and the drag-end routes to the list that owns the
  // active row's key; a drop over the other list's rows finds
  // no target index in the owning list and is ignored by
  // handleKeyedDragEnd. Row keys are unique across both lists
  // (createFormRowKey), so one SortableContext carries all ids.
  const dragSensors = useSensors(
    useSensor(PointerSensor, {activationConstraint: {distance: 5}}),
    useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates}),
  );

  const handleFormDragEnd = (event: DragEndEvent) => {
    if (ingredients.some(row => row.key === event.active.id)) {
      handleKeyedDragEnd(event, ingredients, setIngredients);
    } else if (instructions.some(row => row.key === event.active.id)) {
      handleKeyedDragEnd(event, instructions, setInstructions);
    }
  };

  const buildInput = (): RecipeInput => ({
    title,
    description: description || null,
    servings: Number(servings),
    prepTimeMin: prepTimeMin === '' ? null : Number(prepTimeMin),
    cookTimeMin: cookTimeMin === '' ? null : Number(cookTimeMin),
    imageUrl: pendingImageFile ? null : stripImageCacheKey(imageUrl) || null,
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
    pendingImageFile,
    status,
  ]);

  // The diff crosses to the DS page as presentation data: which fields
  // changed (the page field names — imageUrl is the image section's
  // "image") and the pre-formatted parent-value hint for each changed
  // field's revert affordance.
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
    // dropped. A staged paste the flow has not accepted yet (it
    // refuses while busy or while the crop dialog is open) is guarded
    // the same way: it is not pending yet, so without this check a
    // save could persist and leave the page while the pasted file is
    // still waiting to be staged, losing it silently.
    if (pendingFile || stagedPasteFile) {
      setError(
        i18n._({
          id: 'recipeForm.pendingImageSaveError',
          message: 'Use, crop, or discard the selected image before saving.',
        }),
      );
      return;
    }
    // The design-system page is not a DOM form, so the native
    // required/min blocking the old web form relied on is gone; keep
    // values the API schemas reject (or would silently null out, like
    // a non-numeric time) from being submitted at all.
    const servingsCount = Number(servings);
    if (title === '' || !Number.isInteger(servingsCount) || servingsCount < 1) {
      setError(
        i18n._({
          id: 'recipeForm.titleServingsError',
          message:
            'Title is required, and servings must be a positive whole number.',
        }),
      );
      return;
    }
    const isValidOptionalTime = (value: string) => {
      if (value === '') {
        return true;
      }
      const minutes = Number(value);
      return Number.isInteger(minutes) && minutes >= 0;
    };
    if (
      !isValidOptionalTime(prepTimeMin) ||
      !isValidOptionalTime(cookTimeMin)
    ) {
      setError(
        i18n._({
          id: 'recipeForm.timesError',
          message: 'Prep and cook times must be whole minutes, 0 or more.',
        }),
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(buildInput(), pendingImageFile ?? undefined);
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
    previewUrl ??
    (imageUrl && imageCacheKey > 0
      ? withImageCacheKey(imageUrl, imageCacheKey)
      : imageUrl);

  const dialogButtonStyle = {
    borderRadius: 8,
    border: 'none',
    backgroundColor: eciperayTheme.semantic.primary,
    padding: '8px 16px',
    fontSize: tokens.typography.fontSize.sm,
    fontFamily: tokens.typography.fontFamily.sans,
    fontWeight: tokens.typography.fontWeight.medium,
    color: '#ffffff',
    cursor: 'pointer',
  } as const;
  const dialogSecondaryButtonStyle = {
    ...dialogButtonStyle,
    border: `1px solid ${tokens.colors.gray.gray4}`,
    backgroundColor: '#ffffff',
    color: tokens.colors.gray.gray8,
  } as const;

  return (
    <div
      onPaste={handleFormPaste}
      onDragOver={e => {
        e.preventDefault();
      }}
      onDrop={handleFormDrop}
      // The design-system shell pages place this host as a flex child of
      // their ScreenContainer column, and RecipeFormPage's scroll region
      // is flex:1 — the wrapper must pass the column's height through
      // (flex column, grow, shrinkable), or the region collapses to zero
      // height on web and the form's controls become unreachable.
      style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}
    >
      <DndContext
        sensors={dragSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleFormDragEnd}
      >
        <SortableContext
          items={[
            ...ingredients.map(row => row.key),
            ...instructions.map(row => row.key),
          ]}
          strategy={verticalListSortingStrategy}
        >
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
                  ingredientsChangedLabel: i18n._({
                    id: 'recipeForm.ingredientsChanged',
                    message:
                      'Ingredients changed from parent version ({summary})',
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
                    message:
                      'Instructions changed from parent version ({summary})',
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
              emptyMessage: i18n._({
                id: 'recipeForm.imageEmptyMessage',
                message:
                  'Every keeper deserves a photo — drag and drop one here, paste from your clipboard, browse or take a photo below, or generate one with AI',
              }),
              onPickImageRequest: () => {
                browseInputRef.current?.click();
              },
              onTakePhotoRequest: () => {
                captureInputRef.current?.click();
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
                  ingredient.quantity === null
                    ? ''
                    : String(ingredient.quantity),
                unit: ingredient.unit ?? '',
                name: ingredient.name,
              })),
              onFieldChange: (rowKey, field, value) => {
                const index = ingredients.findIndex(row => row.key === rowKey);
                if (index === -1) {
                  return;
                }
                // The DS row crosses quantity / unit as text; the
                // host folds an empty text back to null, the retired
                // host row's rule. Notes / isOptional never cross —
                // they ride in the host row untouched by key.
                if (field === 'quantity') {
                  updateIngredient(
                    index,
                    'quantity',
                    value === '' ? null : value,
                  );
                } else if (field === 'unit') {
                  updateIngredient(index, 'unit', value === '' ? null : value);
                } else {
                  updateIngredient(index, 'name', value);
                }
              },
              onRemove: rowKey => {
                setIngredients(prev => prev.filter(row => row.key !== rowKey));
              },
              onAdd: () => {
                setIngredients(prev => [
                  ...prev,
                  createEmptyIngredientRow(prev.length),
                ]);
              },
              renderDragHandle: (row, index) => (
                <SortableDragHandle
                  rowKey={row.key}
                  label={i18n._({
                    id: 'recipeForm.reorderIngredient',
                    message: 'Reorder ingredient {position}',
                    values: {position: index + 1},
                  })}
                />
              ),
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
              renderDragHandle: (row, index) => (
                <SortableDragHandle
                  rowKey={row.key}
                  label={i18n._({
                    id: 'recipeForm.reorderStep',
                    message: 'Reorder step {position}',
                    values: {position: index + 1},
                  })}
                />
              ),
            }}
            submitLabel={submitLabel}
            isSubmitting={loading}
            submitError={error}
            onSubmit={() => {
              void handleSubmit();
            }}
          />
        </SortableContext>
      </DndContext>
      {/* The DS image view's pick / take-photo intents land here: the
          hidden file inputs the #124 contract leaves with the host. */}
      <input
        ref={browseInputRef}
        id="recipe-image-upload"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        style={{display: 'none'}}
        disabled={imageBusy}
        onChange={e => {
          acceptImage(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
      <input
        ref={captureInputRef}
        id="recipe-image-capture"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        capture="environment"
        style={{display: 'none'}}
        disabled={imageBusy}
        onChange={e => {
          acceptImage(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
      {pendingFile && pendingPreviewUrl && !cropOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={i18n._({
            id: 'recipeForm.selectedImageLabel',
            message: 'Selected recipe image',
          })}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgb(0 0 0 / 0.6)',
            padding: tokens.spacing[4],
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 8,
              padding: tokens.spacing[4],
              maxWidth: 560,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <img
              src={pendingPreviewUrl}
              alt={i18n._({id: 'recipeForm.recipePreviewAlt', message: 'Recipe preview'})}
              onLoad={handlePendingImageLoad}
              onError={handlePendingPreviewError}
              style={{
                display: 'block',
                marginLeft: 'auto',
                marginRight: 'auto',
                objectFit: 'contain',
                width: '100%',
                maxHeight: 256,
              }}
            />
            {previewError ? (
              <p
                role="alert"
                style={{
                  margin: 0,
                  marginTop: tokens.spacing[2],
                  fontSize: tokens.typography.fontSize.sm,
                  color: tokens.colors.danger.danger7,
                }}
              >
                {previewError}
              </p>
            ) : null}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: tokens.spacing[3],
                marginTop: tokens.spacing[4],
              }}
            >
              <button
                type="button"
                style={dialogButtonStyle}
                onClick={acceptPendingImage}
              >
                {i18n._({id: 'recipeForm.useImage', message: 'Use image'})}
              </button>
              {/* Disabled until the preview loads: crop rectangles are
                  in the real image's pixel space, so a rect computed
                  from the fallback dimensions before load would crop
                  the wrong region. */}
              <button
                type="button"
                style={{
                  ...dialogSecondaryButtonStyle,
                  cursor: !naturalSize ? 'not-allowed' : 'pointer',
                  opacity: !naturalSize ? 0.5 : 1,
                }}
                disabled={!naturalSize}
                onClick={openCrop}
              >
                {i18n._({id: 'recipeForm.cropImage', message: 'Crop image'})}
              </button>
              <button
                type="button"
                style={{
                  ...dialogButtonStyle,
                  backgroundColor: tokens.colors.gray.gray2,
                  color: tokens.colors.gray.gray8,
                }}
                onClick={clearPendingSelection}
              >
                {i18n._({
                  id: 'recipeForm.discardSelectedImage',
                  message: 'Discard selected image',
                })}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {cropOpen && pendingFile && pendingPreviewUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={i18n._({
            id: 'recipeForm.cropDialogLabel',
            message: 'Crop recipe image',
          })}
          onKeyDown={e => {
            if (e.key === 'Escape' && !cropBusy) {
              cancelCrop();
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgb(0 0 0 / 0.6)',
            padding: tokens.spacing[4],
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 8,
              padding: tokens.spacing[4],
              maxWidth: 560,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <p
              style={{
                margin: 0,
                marginBottom: tokens.spacing[3],
                fontSize: tokens.typography.fontSize.sm,
                fontWeight: tokens.typography.fontWeight.medium,
                color: tokens.colors.gray.gray8,
              }}
            >
              {i18n._({
                id: 'recipeForm.cropInstructions',
                message:
                  'Crop image — drag the box to move it, drag its corner to resize, or focus it and use the arrow keys (Shift + arrow keys resizes).',
              })}
            </p>
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 480,
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              <img
                ref={cropImageRef}
                src={pendingPreviewUrl}
                alt={i18n._({id: 'recipeForm.imageToCropAlt', message: 'Image to crop'})}
                onLoad={handlePendingImageLoad}
                style={{display: 'block', width: '100%'}}
              />
              <div
                ref={cropBoxRef}
                role="group"
                tabIndex={0}
                aria-label={i18n._({
                  id: 'recipeForm.cropAreaLabel',
                  message:
                    'Crop area. Arrow keys move the crop area; Shift plus arrow keys resize it.',
                })}
                onPointerDown={handleCropPointerDown('move')}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
                onKeyDown={handleCropBoxKeyDown}
                style={{
                  position: 'absolute',
                  ...cropBoxPercent,
                  border: `2px solid ${eciperayTheme.semantic.primary}`,
                  backgroundColor: 'rgb(194 65 12 / 0.15)',
                  cursor: 'move',
                  touchAction: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  aria-hidden="true"
                  onPointerDown={handleCropPointerDown('resize')}
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={handleCropPointerUp}
                  style={{
                    position: 'absolute',
                    right: -8,
                    bottom: -8,
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    backgroundColor: eciperayTheme.semantic.primary,
                    cursor: 'nwse-resize',
                    touchAction: 'none',
                  }}
                />
              </div>
            </div>
            {cropError ? (
              <p
                role="alert"
                style={{
                  margin: 0,
                  marginTop: tokens.spacing[2],
                  fontSize: tokens.typography.fontSize.sm,
                  color: tokens.colors.danger.danger7,
                }}
              >
                {cropError}
              </p>
            ) : null}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: tokens.spacing[3],
                marginTop: tokens.spacing[4],
              }}
            >
              <button
                type="button"
                style={{
                  ...dialogButtonStyle,
                  cursor: cropBusy ? 'not-allowed' : 'pointer',
                  opacity: cropBusy ? 0.5 : 1,
                }}
                disabled={cropBusy}
                onClick={() => {
                  void applyCrop();
                }}
              >
                {cropBusy
                  ? i18n._({id: 'recipeForm.cropping', message: 'Cropping…'})
                  : i18n._({id: 'recipeForm.applyCrop', message: 'Apply crop'})}
              </button>
              <button
                type="button"
                style={{
                  ...dialogSecondaryButtonStyle,
                  cursor: cropBusy ? 'not-allowed' : 'pointer',
                  opacity: cropBusy ? 0.5 : 1,
                }}
                disabled={cropBusy}
                onClick={cancelCrop}
              >
                {i18n._({id: 'recipeForm.cancelCrop', message: 'Cancel crop'})}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
