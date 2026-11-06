/* eslint-disable max-lines -- recipe image upload, paste, crop, and generate controls */
import {Button, eciperayTheme, tokens} from '@spudly/ui';
import {useEffect, useRef, useState} from 'react';

import {
  getImageFileFromDataTransfer,
  shouldIgnoreImagePaste,
} from '../../lib/recipeImageInput.js';
import {
  clampCropRect,
  cropImageFile,
  defaultCropRect,
  moveCropRect,
  resizeCropRect,
  type CropRect,
} from '../../lib/recipeImageCrop.js';

type Props = {
  imagePreview: string | null;
  imageUploading: boolean;
  imageGenerating?: boolean;
  imageError: string | null;
  canGenerateImage?: boolean;
  headerAction?: React.ReactNode;
  onImageFile: (file: File) => void | Promise<void>;
  onGenerateImage?: () => void | Promise<void>;
  onRemove: () => void;
};

// Style objects on DS tokens (B7 C12, design-system#130 — the Tailwind
// utilities these replace are gone with the dependency).
// Parity note (design-system#129): the app mirror's showcase demo was
// removed with the in-app component showcase; this web mirror keeps its
// own demo for the web showcase page, so no web change was needed.
export const RecipeImageField = ({
  imagePreview,
  imageUploading,
  imageGenerating = false,
  imageError,
  canGenerateImage = true,
  headerAction,
  onImageFile,
  onGenerateImage,
  onRemove,
}: Props) => {
  const [isDragging, setIsDragging] = useState(false);
  const captureInputRef = useRef<HTMLInputElement>(null);
  const browseInputRef = useRef<HTMLInputElement>(null);
  const imageBusy = imageUploading || imageGenerating;

  // Crop step (#406): a picked file becomes the pending image first. The
  // user can crop it, use it as-is (skip), or discard it; only then does the
  // (possibly cropped) file flow into onImageFile.
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
  const cropBoxRef = useRef<HTMLDivElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);
  // The pending preview's object URL, owned outside React state so its
  // create/revoke never runs inside a state updater (Strict Mode invokes
  // updaters twice, which would leak one URL per selection).
  const pendingPreviewUrlRef = useRef<string | null>(null);
  const dragStateRef = useRef<{
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    startRect: CropRect;
  } | null>(null);

  const displayedPreview = pendingPreviewUrl ?? imagePreview;
  // Until the browser reports the real dimensions, assume a 4:3 frame so
  // the default crop box is still sensible.
  const effectiveNaturalSize = naturalSize ?? {width: 1200, height: 900};
  const effectiveCropRect =
    cropRect ??
    defaultCropRect(effectiveNaturalSize.width, effectiveNaturalSize.height);

  const clearPending = () => {
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
  };

  const acceptImage = (file: File | null) => {
    if (!file || imageBusy) {
      return;
    }
    setPendingFile(file);
    if (pendingPreviewUrlRef.current) {
      URL.revokeObjectURL(pendingPreviewUrlRef.current);
    }
    const previewUrl = URL.createObjectURL(file);
    pendingPreviewUrlRef.current = previewUrl;
    setPendingPreviewUrl(previewUrl);
    setNaturalSize(null);
    setCropRect(null);
    setCropError(null);
    setCropOpen(false);
  };

  /** Skip: hand the original, uncropped file to the existing callback. */
  const acceptPendingImage = () => {
    if (!pendingFile) {
      return;
    }
    const file = pendingFile;
    clearPending();
    void onImageFile(file);
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
      clearPending();
      void onImageFile(cropped);
    } catch {
      setCropError(
        'Failed to crop image — try again or cancel to use the original.',
      );
      setCropBusy(false);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
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

  useEffect(() => {
    if (cropOpen) {
      cropBoxRef.current?.focus();
    }
  }, [cropOpen]);

  // Revoke the pending preview URL if the component unmounts mid-selection.
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

  const handlePaste = (e: React.ClipboardEvent) => {
    if (shouldIgnoreImagePaste(e.target)) {
      return;
    }
    const file = getImageFileFromDataTransfer(e.clipboardData);
    if (!file) {
      return;
    }
    e.preventDefault();
    acceptImage(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    acceptImage(getImageFileFromDataTransfer(e.dataTransfer));
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const generateDisabled = imageBusy || !canGenerateImage;

  return (
    <div onPaste={handlePaste}>
      <div
        style={{
          marginBottom: tokens.spacing[1],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: tokens.spacing[2],
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: tokens.typography.fontSize.sm,
            fontWeight: tokens.typography.fontWeight.medium,
            color: tokens.colors.gray.gray8,
          }}
        >
          Recipe image
        </p>
        {headerAction}
      </div>
      <div
        role="group"
        aria-label="Recipe image drop zone"
        tabIndex={0}
        onDragOver={handleDragEnter}
        onDragEnter={handleDragEnter}
        onDragLeave={e => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
          }
        }}
        onDrop={handleDrop}
        style={{
          marginBottom: tokens.spacing[3],
          borderRadius: 8,
          borderWidth: 2,
          borderStyle: 'dashed',
          padding: tokens.spacing[4],
          borderColor: isDragging
            ? eciperayTheme.semantic.primary
            : tokens.colors.gray.gray4,
          backgroundColor: isDragging
            ? 'rgb(194 65 12 / 0.05)'
            : tokens.colors.gray.gray1,
        }}
      >
        {displayedPreview ? (
          <img
            src={displayedPreview}
            alt="Recipe preview"
            onLoad={pendingPreviewUrl ? handleImageLoad : undefined}
            style={{
              display: 'block',
              marginLeft: 'auto',
              marginRight: 'auto',
              objectFit: 'contain',
              width: '100%',
              maxHeight: 256,
            }}
          />
        ) : (
          <p
            style={{
              margin: 0,
              color: eciperayTheme.semantic.textMuted,
              textAlign: 'center',
              fontSize: tokens.typography.fontSize.sm,
            }}
          >
            Drag and drop an image here, paste from your clipboard, browse or
            take a photo below, or generate one with AI
          </p>
        )}
      </div>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: tokens.spacing[3]}}>
        {pendingFile ? (
          <>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onPress={acceptPendingImage}
            >
              Use image
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onPress={openCrop}
            >
              Crop image
            </Button>
            <button
              type="button"
              style={{
                borderRadius: 8,
                border: 'none',
                backgroundColor: tokens.colors.gray.gray2,
                padding: '8px 16px',
                fontSize: tokens.typography.fontSize.sm,
                fontFamily: tokens.typography.fontFamily.sans,
                color: tokens.colors.gray.gray8,
                cursor: 'pointer',
              }}
              onClick={clearPending}
            >
              Discard selected image
            </button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={imageBusy}
              onPress={() => {
                browseInputRef.current?.click();
              }}
            >
              {imageUploading ? 'Uploading…' : 'Browse images'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={imageBusy}
              onPress={() => {
                captureInputRef.current?.click();
              }}
            >
              Take photo
            </Button>
            {onGenerateImage ? (
              <button
                type="button"
                aria-label="Generate image with AI"
                style={{
                  border: `1px solid ${eciperayTheme.semantic.primary}`,
                  color: eciperayTheme.semantic.primary,
                  display: 'inline-flex',
                  borderRadius: 8,
                  backgroundColor: '#ffffff',
                  padding: '8px 16px',
                  fontSize: tokens.typography.fontSize.sm,
                  fontFamily: tokens.typography.fontFamily.sans,
                  fontWeight: tokens.typography.fontWeight.medium,
                  cursor: generateDisabled ? 'not-allowed' : 'pointer',
                  opacity: generateDisabled ? 0.5 : 1,
                }}
                disabled={generateDisabled}
                onClick={() => {
                  void onGenerateImage();
                }}
              >
                {imageGenerating ? 'Generating…' : 'Generate with AI'}
              </button>
            ) : null}
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
            {imagePreview ? (
              <button
                type="button"
                style={{
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: tokens.colors.gray.gray2,
                  padding: '8px 16px',
                  fontSize: tokens.typography.fontSize.sm,
                  fontFamily: tokens.typography.fontFamily.sans,
                  color: tokens.colors.gray.gray8,
                  cursor: 'pointer',
                }}
                onClick={onRemove}
              >
                Remove image
              </button>
            ) : null}
          </>
        )}
      </div>
      {cropOpen && pendingFile && pendingPreviewUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Crop recipe image"
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
              Crop image — drag the box to move it, drag its corner to resize,
              or focus it and use the arrow keys (Shift + arrow keys resizes).
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
                alt="Image to crop"
                onLoad={handleImageLoad}
                style={{display: 'block', width: '100%'}}
              />
              <div
                ref={cropBoxRef}
                role="group"
                tabIndex={0}
                aria-label="Crop area. Arrow keys move the crop area; Shift plus arrow keys resize it."
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
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={cropBusy}
                onPress={() => {
                  void applyCrop();
                }}
              >
                {cropBusy ? 'Cropping…' : 'Apply crop'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={cropBusy}
                onPress={cancelCrop}
              >
                Cancel crop
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {imageError ? (
        <p
          style={{
            margin: 0,
            marginTop: tokens.spacing[2],
            fontSize: tokens.typography.fontSize.sm,
            color: tokens.colors.danger.danger7,
          }}
        >
          {imageError}
        </p>
      ) : null}
    </div>
  );
};

if (import.meta.env.DEV) {
  RecipeImageField.demo = function RecipeImageFieldDemo() {
    return (
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImageFile={() => {
          void 0;
        }}
        onRemove={() => {
          void 0;
        }}
      />
    );
  };
}
