import {useAnalytics} from '@eciperay/client';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {ImportImageView} from '../components/import/ImportImageView.js';
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

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const base64 = await readFileAsBase64(file);
      const recipe = await eciperay.import.importImage(base64);
      analytics.track('recipe_imported', {
        recipe_id: recipe.id,
        source: 'image',
      });
      void navigate(`/import/review/${recipe.id}`);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImportImageView
      loading={loading}
      error={error}
      onFileSelected={file => {
        void handleFile(file);
      }}
    />
  );
};
