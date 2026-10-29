import {isDuplicateRecipeError, useAnalytics} from '@eciperay/client';
import {useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {ImportImagePage as ImportImagePageView} from '@spudly/ui/pages';

import {eciperay} from '../lib/api.js';

const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });

export const ImportImagePage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const analytics = useAnalytics();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  // Image payload that already drew the duplicate warning (#296): picking
  // the same image again means "import anyway" and creates a second copy.
  const duplicateWarnedImageRef = useRef<string | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    let base64: string | null = null;
    try {
      base64 = await readFileAsBase64(file);
      const recipe = await eciperay.import.importImage(base64, {
        allowDuplicate: duplicateWarnedImageRef.current === base64,
      });
      analytics.track('recipe_imported', {
        recipe_id: recipe.id,
        source: 'image',
      });
      void navigate(`/import/review/${recipe.id}`);
    } catch (error_) {
      if (base64 !== null && isDuplicateRecipeError(error_)) {
        duplicateWarnedImageRef.current = base64;
      }
      setError(error_ instanceof Error ? error_.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      void handleFile(file);
    }
  };

  return (
    <>
      <ImportImagePageView
        loading={loading}
        error={error}
        onPickCamera={() => {
          cameraInputRef.current?.click();
        }}
        onPickLibrary={() => {
          libraryInputRef.current?.click();
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Take a photo of a recipe"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        aria-label="Upload recipe image"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
};
