import {Alert, PermissionsAndroid, Platform} from 'react-native';

export const CAMERA_PERMISSION_RATIONALE = {
  title: 'Camera access',
  message:
    'Eciperay needs camera access so you can photograph a recipe to import.',
  buttonPositive: 'Allow',
  buttonNegative: 'Not now',
};

export const PHOTO_LIBRARY_RATIONALE = {
  title: 'Choose a recipe image',
  message:
    'You can pick a photo from your library. Eciperay only accesses the image you select.',
};

export const ensureCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const alreadyGranted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.CAMERA,
  );
  if (alreadyGranted) {
    return true;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    CAMERA_PERMISSION_RATIONALE,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

export const confirmPhotoLibraryAccess = (): Promise<boolean> =>
  new Promise(resolve => {
    Alert.alert(
      PHOTO_LIBRARY_RATIONALE.title,
      PHOTO_LIBRARY_RATIONALE.message,
      [
        {text: 'Cancel', style: 'cancel', onPress: () => { resolve(false); }},
        {text: 'Continue', onPress: () => { resolve(true); }},
      ],
    );
  });
