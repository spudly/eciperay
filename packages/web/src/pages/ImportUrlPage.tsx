import {useAnalytics} from '@eciperay/client';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {eciperay} from '../lib/api.js';

export const ImportUrlPage = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const analytics = useAnalytics();

  const handleImport = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const recipe = await eciperay.import.importUrl(url);
      analytics.track('recipe_imported', {recipe_id: recipe.id, source: 'url'});
      void navigate(`/import/review/${recipe.id}`);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Import from URL</h1>
      <form
        onSubmit={e => {
          void handleImport(e);
        }}
        className="space-y-4"
      >
        <input
          required
          type="url"
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
          placeholder="https://example.com/recipe"
          value={url}
          onChange={e => {
            setUrl(e.target.value);
          }}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="
            bg-primary w-full rounded-lg py-3 font-semibold text-white
            disabled:opacity-50
          "
        >
          {loading ? 'Importing…' : 'Import'}
        </button>
      </form>
    </div>
  );
};
