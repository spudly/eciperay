import {isDuplicateRecipeError, useAnalytics} from '@eciperay/client';
import {useLingui} from '@lingui/react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useState} from 'react';

import {ImportTextPage} from '@spudly/ui';
import {eciperay} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AddStackParamList, 'ImportText'>;

export const ImportTextScreen = ({navigation}: Props) => {
  const {i18n} = useLingui();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Text that already drew the duplicate warning (#296): submitting the
  // same text again means "import anyway" and creates a second copy.
  const [duplicateWarnedText, setDuplicateWarnedText] = useState<string | null>(
    null,
  );
  const analytics = useAnalytics();

  const handleImport = async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const recipe = await eciperay.import.importText(text, {
        allowDuplicate: duplicateWarnedText === text,
      });
      analytics.track('recipe_imported', {
        recipe_id: recipe.id,
        source: 'text',
      });
      navigation.navigate('ImportReview', {recipeId: recipe.id});
    } catch (error_) {
      if (isDuplicateRecipeError(error_)) {
        setDuplicateWarnedText(text);
      }
      setError(error_ instanceof Error ? error_.message : i18n._({id: 'import.failed', message: 'Import failed'}));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImportTextPage
      loading={loading}
      error={error}
      onSubmit={text => {
        void handleImport(text);
      }}
    />
  );
};
