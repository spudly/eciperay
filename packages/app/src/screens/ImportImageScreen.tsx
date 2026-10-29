import {isDuplicateRecipeError, useAnalytics} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useRef, useState} from 'react';
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
  // Image payload that already drew the duplicate warning (#296): picking
  // the same image again means "import anyway" and creates a second copy.
  const duplicateWarnedImageRef = useRef<string | null>(null);
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
    let pickedBase64: string | null = null;
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

      const base64 = asset.base64 ?? '';
      pickedBase64 = base64;
      const recipe = await api.import.importImage(base64, {
        allowDuplicate: duplicateWarnedImageRef.current === base64,
      });
      analytics.track('recipe_imported', {
        recipe_id: recipe.id,
        source: 'image',
      });
      navigation.navigate('ImportReview', {recipeId: recipe.id});
    } catch (error_) {
      const message =
        error_ instanceof Error ? error_.message : 'Import failed';
      setError(message);
      if (isDuplicateRecipeError(error_)) {
        duplicateWarnedImageRef.current = pickedBase64;
        // The warning is not a failure: show it inline via the page's
        // error notice (importing the same image again proceeds), rather
        // than the failure alert.
        return;
      }
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
