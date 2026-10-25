import {useAnalytics} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useState} from 'react';

import {ImportUrlPage} from '@spudly/ui/pages';
import {api} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AddStackParamList, 'ImportUrl'>;

export const ImportUrlScreen = ({navigation}: Props) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analytics = useAnalytics();

  const handleImport = async () => {
    /* istanbul ignore next -- import button disabled when URL is empty */
    if (!url.trim()) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const recipe = await api.import.importUrl(url);
      analytics.track('recipe_imported', {recipe_id: recipe.id, source: 'url'});
      navigation.navigate('ImportReview', {recipeId: recipe.id});
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImportUrlPage
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
