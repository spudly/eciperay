import {useAnalytics} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useState} from 'react';

import {ImportTextView} from '../components/import/ImportTextView';
import {api} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AddStackParamList, 'ImportText'>;

export const ImportTextScreen = ({navigation}: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analytics = useAnalytics();

  const handleImport = async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const recipe = await api.import.importText(text);
      analytics.track('recipe_imported', {
        recipe_id: recipe.id,
        source: 'text',
      });
      navigation.navigate('ImportReview', {recipeId: recipe.id});
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImportTextView
      loading={loading}
      error={error}
      onSubmit={text => {
        void handleImport(text);
      }}
    />
  );
};
