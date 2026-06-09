import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {recipoo} from '../lib/api.js';

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

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const base64 = await readFileAsBase64(file);
      const recipe = await recipoo.import.importImage(base64);
      void navigate(`/import/review/${recipe.id}`);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Import from Image
      </h1>
      <input
        id="image-upload"
        type="file"
        accept="image/*"
        aria-label="Upload recipe image"
        disabled={loading}
        onChange={e => {
          void handleFile(e);
        }}
      />
      {loading ? <p className="text-muted mt-4">Importing…</p> : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </div>
  );
};
