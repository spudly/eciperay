import {useAnalytics} from '@eciperay/client';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {ImportTextPage as ImportTextPageView} from '@spudly/ui/pages';

import {eciperay} from '../lib/api.js';

export const ImportTextPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const analytics = useAnalytics();

  const handleImport = async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const recipe = await eciperay.import.importText(text);
      analytics.track('recipe_imported', {
        recipe_id: recipe.id,
        source: 'text',
      });
      void navigate(`/import/review/${recipe.id}`);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImportTextPageView
      loading={loading}
      error={error}
      onSubmit={text => {
        void handleImport(text);
      }}
    />
  );
};
