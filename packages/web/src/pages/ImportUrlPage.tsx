import {useAnalytics} from '@eciperay/client';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {ImportUrlPage as ImportUrlPageView} from '@spudly/ui/pages';

import {eciperay} from '../lib/api.js';

export const ImportUrlPage = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const analytics = useAnalytics();

  const handleImport = async () => {
    if (!url.trim() || loading) {
      return;
    }
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
    <ImportUrlPageView
      url={url}
      onUrlChange={setUrl}
      loading={loading}
      error={error}
      onSubmit={() => {
        void handleImport();
      }}
    />
  );
};
