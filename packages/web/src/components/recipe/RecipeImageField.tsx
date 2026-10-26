/* eslint-disable max-lines -- recipe image upload, paste, and generate controls */
import clsx from 'clsx';
import {useState} from 'react';

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

  return (
    <div onPaste={handlePaste}>
      <div className="mbe-1 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-700">Recipe image</p>
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
        className={clsx(
          `mbe-3 rounded-lg border-2 border-dashed p-4 transition-colors`,
          {
            'border-primary bg-primary/5': isDragging,
            'border-gray-300 bg-gray-50': !isDragging,
          },
        )}
      >
        {imagePreview ? (
          <img
            src={imagePreview}
            alt="Recipe preview"
            className="mx-auto object-contain inline-full max-block-64"
          />
        ) : (
          <p className="text-muted text-center text-sm">
            Drag and drop an image here, paste from your clipboard, browse
            below, or generate one with AI
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <label
          htmlFor="recipe-image-upload"
          className="
            bg-primary inline-flex cursor-pointer rounded-lg px-4 py-2 text-sm
            font-medium text-white
          "
        >
          {imageUploading ? 'Uploading…' : 'Browse images'}
        </label>
        {onGenerateImage ? (
          <button
            type="button"
            aria-label="Generate image with AI"
            className="
              border-primary text-primary inline-flex rounded-lg border bg-white
              px-4 py-2 text-sm font-medium
              disabled:cursor-not-allowed disabled:opacity-50
            "
            disabled={imageBusy || !canGenerateImage}
            onClick={() => {
              void onGenerateImage();
            }}
          >
            {imageGenerating ? 'Generating…' : 'Generate with AI'}
          </button>
        ) : null}
        <input
          id="recipe-image-upload"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          disabled={imageBusy}
          onChange={e => {
            acceptImage(e.target.files?.[0] ?? null);
            e.target.value = '';
          }}
        />
        {imagePreview ? (
          <button
            type="button"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700"
            onClick={onRemove}
          >
            Remove image
          </button>
        ) : null}
      </div>
      {imageError ? (
        <p className="mbs-2 text-sm text-red-600">{imageError}</p>
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
