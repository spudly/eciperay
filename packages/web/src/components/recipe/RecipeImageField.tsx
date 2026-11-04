/* eslint-disable max-lines -- recipe image upload, paste, and generate controls */
import {eciperayTheme, tokens} from '@spudly/ui';
import type {CSSProperties} from 'react';
import {useRef, useState} from 'react';

import {
  getImageFileFromDataTransfer,
  shouldIgnoreImagePaste,
} from '../../lib/recipeImageInput.js';

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
const browseLabelStyle: CSSProperties = {
  backgroundColor: eciperayTheme.semantic.primary,
  display: 'inline-flex',
  cursor: 'pointer',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: tokens.typography.fontSize.sm,
  fontFamily: tokens.typography.fontFamily.sans,
  fontWeight: tokens.typography.fontWeight.medium,
  color: '#ffffff',
};

const captureButtonStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  border: `1px solid ${eciperayTheme.semantic.primary}`,
  color: eciperayTheme.semantic.primary,
  display: 'inline-flex',
  cursor: 'pointer',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: tokens.typography.fontSize.sm,
  fontFamily: tokens.typography.fontFamily.sans,
  fontWeight: tokens.typography.fontWeight.medium,
};

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

  const acceptImage = (file: File | null) => {
    if (!file || imageBusy) {
      return;
    }
    void onImageFile(file);
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
        {imagePreview ? (
          <img
            src={imagePreview}
            alt="Recipe preview"
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
        <button
          type="button"
          style={{
            ...browseLabelStyle,
            border: 'none',
            cursor: imageBusy ? 'not-allowed' : 'pointer',
            opacity: imageBusy ? 0.5 : 1,
          }}
          disabled={imageBusy}
          onClick={() => {
            browseInputRef.current?.click();
          }}
        >
          {imageUploading ? 'Uploading…' : 'Browse images'}
        </button>
        <button
          type="button"
          aria-label="Take photo"
          style={{
            ...captureButtonStyle,
            cursor: imageBusy ? 'not-allowed' : 'pointer',
            opacity: imageBusy ? 0.5 : 1,
          }}
          disabled={imageBusy}
          onClick={() => {
            captureInputRef.current?.click();
          }}
        >
          Take photo
        </button>
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
      </div>
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
