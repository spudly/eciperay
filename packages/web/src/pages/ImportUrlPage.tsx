import {isDuplicateRecipeError, useAnalytics} from '@eciperay/client';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {ImportUrlPage as ImportUrlPageView} from '@spudly/ui/pages';

import {eciperay} from '../lib/api.js';

export const ImportUrlPage = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // URL that already drew the duplicate warning (#296): submitting the
  // same URL again means "import anyway" and creates a second copy.
  const [duplicateWarnedUrl, setDuplicateWarnedUrl] = useState<string | null>(
    null,
  );
  const navigate = useNavigate();
  const analytics = useAnalytics();

  const handleImport = async () => {
    if (!url.trim() || loading) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const recipe = await eciperay.import.importUrl(url, {
        allowDuplicate: duplicateWarnedUrl === url,
      });
      analytics.track('recipe_imported', {recipe_id: recipe.id, source: 'url'});
      void navigate(`/import/review/${recipe.id}`);
    } catch (error_) {
      if (isDuplicateRecipeError(error_)) {
        setDuplicateWarnedUrl(url);
      }
      setError(error_ instanceof Error ? error_.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImportUrlPageView
      url={url}
      onUrlChange={value => {
        setUrl(value);
        if (value !== duplicateWarnedUrl) {
          setDuplicateWarnedUrl(null);
        }
      }}
      loading={loading}
      error={error}
      onSubmit={() => {
        void handleImport();
      }}
    />
  );
};
