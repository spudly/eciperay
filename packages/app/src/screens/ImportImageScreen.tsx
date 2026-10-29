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

type PickSource = 'camera' | 'library';

export const ImportImageScreen = ({navigation}: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Capture that already drew the duplicate warning (#296), retained with
  // its source: a fresh camera capture produces a different payload, so
  // the override cannot rely on matching a re-pick — pressing the same
  // source again resubmits THIS payload with allowDuplicate. Pressing the
  // other source starts a new pick and discards the retained capture.
  const duplicateWarnedRef = useRef<{
    base64: string;
    source: PickSource;
  } | null>(null);
  const analytics = useAnalytics();

  const submitImage = async (base64: string, allowDuplicate: boolean) => {
    const recipe = await api.import.importImage(base64, {allowDuplicate});
    analytics.track('recipe_imported', {
      recipe_id: recipe.id,
      source: 'image',
    });
    navigation.navigate('ImportReview', {recipeId: recipe.id});
  };

  const handlePick = async (source: PickSource) => {
    const warned = duplicateWarnedRef.current;
    if (warned && warned.source === source) {
      // "Import anyway": resubmit the warned capture as a second copy.
      duplicateWarnedRef.current = null;
      setLoading(true);
      setError(null);
      try {
        await submitImage(warned.base64, true);
      } catch (error_) {
        const message =
          error_ instanceof Error ? error_.message : 'Import failed';
        setError(message);
        Alert.alert('Import failed', message);
      } finally {
        setLoading(false);
      }
      return;
    }
    duplicateWarnedRef.current = null;

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

      pickedBase64 = asset.base64 ?? '';
      await submitImage(pickedBase64, false);
    } catch (error_) {
      const message =
        error_ instanceof Error ? error_.message : 'Import failed';
      setError(message);
      if (isDuplicateRecipeError(error_) && pickedBase64 !== null) {
        duplicateWarnedRef.current = {base64: pickedBase64, source};
        // The warning is not a failure: show it inline via the page's
        // error notice (pressing the same source again imports anyway),
        // rather than the failure alert.
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
