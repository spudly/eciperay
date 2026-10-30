import {isDuplicateRecipeError, useAnalytics} from '@eciperay/client';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useState} from 'react';
import {Alert, View} from 'react-native';

import {launchCamera, launchImageLibrary} from 'react-native-image-picker';

import {Button as DsButton, tokens} from '@spudly/ui';
import {ImportImagePage} from '@spudly/ui/pages';
import {api} from '../lib/api';
import {
  confirmPhotoLibraryAccess,
  ensureCameraPermission,
} from '../lib/androidPermissions';
import type {AddStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<AddStackParamList, 'ImportImage'>;

type PickSource = 'camera' | 'library';

const importAnywayContainerStyle = {
  paddingHorizontal: tokens.spacing[4],
  marginTop: tokens.spacing[3],
} as const;

export const ImportImageScreen = ({navigation}: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Capture that already drew the duplicate warning (#296), retained so
  // the user can still create a second copy of THIS capture — but only
  // via the separately labeled "Import anyway" action below. "Take
  // Photo" / "Choose from Library" always start a NEW pick: pressing
  // "Take Photo" after a warning must open the camera, never silently
  // resubmit the previous capture as a duplicate the user didn't ask for.
  const [duplicateWarnedCapture, setDuplicateWarnedCapture] = useState<
    string | null
  >(null);
  const analytics = useAnalytics();

  const submitImage = async (base64: string, allowDuplicate: boolean) => {
    const recipe = await api.import.importImage(base64, {allowDuplicate});
    analytics.track('recipe_imported', {recipe_id: recipe.id, source: 'image'});
    navigation.navigate('ImportReview', {recipeId: recipe.id});
  };

  const handleImportAnyway = async (warnedCapture: string) => {
    setLoading(true);
    setError(null);
    try {
      await submitImage(warnedCapture, true);
      // Only a successful override consumes the retained capture: if the
      // import fails, the "Import anyway" action must stay available for
      // this capture — a camera capture may not be re-creatable.
      setDuplicateWarnedCapture(null);
    } catch (error_) {
      const message =
        error_ instanceof Error ? error_.message : 'Import failed';
      setError(message);
      Alert.alert('Import failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handlePick = async (source: PickSource) => {
    // A retained warned capture is discarded only once a replacement
    // image is actually selected below: cancelling the picker or being
    // denied permission must not strand the user without the
    // "Import anyway" retry for the capture they already warned on.
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

      // A replacement image has actually been selected, so the retained
      // warned capture is superseded (if this new import itself warns,
      // the catch below retains the NEW capture instead) and any prior
      // notice — in particular the duplicate warning that explains the
      // retained capture's "Import anyway" action — is cleared only
      // now: clearing it before the picker returned would leave that
      // action visible without its warning after a cancellation.
      setError(null);
      setDuplicateWarnedCapture(null);
      pickedBase64 = asset.base64 ?? '';
      await submitImage(pickedBase64, false);
    } catch (error_) {
      const message =
        error_ instanceof Error ? error_.message : 'Import failed';
      setError(message);
      if (isDuplicateRecipeError(error_) && pickedBase64 !== null) {
        setDuplicateWarnedCapture(pickedBase64);
        // The warning is not a failure: show it inline via the page's
        // error notice (the "Import anyway" action below resubmits this
        // capture), rather than the failure alert.
        return;
      }
      Alert.alert('Import failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
      {duplicateWarnedCapture !== null ? (
        <View style={importAnywayContainerStyle}>
          <DsButton
            variant="primary"
            disabled={loading}
            onPress={() => {
              void handleImportAnyway(duplicateWarnedCapture);
            }}
            accessibilityLabel="Import anyway"
          >
            Import anyway
          </DsButton>
        </View>
      ) : null}
    </>
  );
};
