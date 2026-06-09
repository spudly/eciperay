import {useState} from 'react';

import {
  getImageFileFromDataTransfer,
  shouldIgnoreImagePaste,
} from '../../lib/recipeImageInput.js';

type Props = {
  imagePreview: string | null;
  imageUploading: boolean;
  imageError: string | null;
  onImageFile: (file: File) => void | Promise<void>;
  onRemove: () => void;
};

export const RecipeImageField = ({
  imagePreview,
  imageUploading,
  imageError,
  onImageFile,
  onRemove,
}: Props) => {
  const [isDragging, setIsDragging] = useState(false);

  const acceptImage = (file: File | null) => {
    if (!file || imageUploading) {
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

  return (
    <div onPaste={handlePaste}>
      <p className="mb-1 block text-sm font-medium text-gray-700">
        Recipe image
      </p>
      <div
        role="group"
        aria-label="Recipe image drop zone"
        tabIndex={0}
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragEnter={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={e => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
          }
        }}
        onDrop={handleDrop}
        className={`
          mb-3 rounded-lg border-2 border-dashed p-4 transition-colors
          ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 bg-gray-50'
          }
        `}
      >
        {imagePreview ? (
          <img
            src={imagePreview}
            alt="Recipe preview"
            className="mx-auto max-h-64 w-full object-contain"
          />
        ) : (
          <p className="text-muted text-center text-sm">
            Drag and drop an image here, paste from your clipboard, or browse
            below
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
        <input
          id="recipe-image-upload"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          disabled={imageUploading}
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
        <p className="mt-2 text-sm text-red-600">{imageError}</p>
      ) : null}
    </div>
  );
};
