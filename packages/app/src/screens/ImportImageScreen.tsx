import {useAnalytics} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useState} from 'react';
import {Alert} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';

import {ImportImagePage} from '@spudly/ui/pages';
import {api} from '../lib/api';
import {
  confirmPhotoLibraryAccess,
  ensureCameraPermission,
} from '../lib/androidPermissions';
import type {AddStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AddStackParamList, 'ImportImage'>;

export const ImportImageScreen = ({navigation}: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analytics = useAnalytics();

  const handlePick = async (source: 'camera' | 'library') => {
    if (source === 'camera') {
      const granted = await ensureCameraPermission();
      if (!granted) {
        return;
      }
    } else {
      const confirmed = await confirmPhotoLibraryAccess();
      if (!confirmed) {
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const result =
        source === 'camera'
          ? await launchCamera({mediaType: 'photo', includeBase64: true})
          : await launchImageLibrary({mediaType: 'photo', includeBase64: true});

      if (result.didCancel) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset) {
        return;
      }

      const recipe = await api.import.importImage(asset.base64 ?? '');
      analytics.track('recipe_imported', {
        recipe_id: recipe.id,
        source: 'image',
      });
      navigation.navigate('ImportReview', {recipeId: recipe.id});
    } catch (error_) {
      const message =
        error_ instanceof Error ? error_.message : 'Import failed';
      setError(message);
      Alert.alert('Import failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImportImagePage
      loading={loading}
      error={error}
      onPickCamera={() => {
        void handlePick('camera');
      }}
      onPickLibrary={() => {
        void handlePick('library');
      }}
    />
  );
};
