import {Alert, PermissionsAndroid, Platform} from 'react-native';

import {
  CAMERA_PERMISSION_RATIONALE,
  confirmPhotoLibraryAccess,
  ensureCameraPermission,
  PHOTO_LIBRARY_RATIONALE,
} from './androidPermissions';

describe('androidPermissions', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {value: originalPlatform});
    jest.restoreAllMocks();
  });

  describe('ensureCameraPermission', () => {
    it('returns true on non-Android platforms', async () => {
      Object.defineProperty(Platform, 'OS', {value: 'ios'});
      const checkSpy = jest.spyOn(PermissionsAndroid, 'check');
      await expect(ensureCameraPermission()).resolves.toBe(true);
      expect(checkSpy).not.toHaveBeenCalled();
    });

    it('returns true when camera permission is already granted', async () => {
      Object.defineProperty(Platform, 'OS', {value: 'android'});
      jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);
      const requestSpy = jest.spyOn(PermissionsAndroid, 'request');
      await expect(ensureCameraPermission()).resolves.toBe(true);
      expect(requestSpy).not.toHaveBeenCalled();
    });

    it('requests camera permission with rationale when needed', async () => {
      Object.defineProperty(Platform, 'OS', {value: 'android'});
      jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
      jest
        .spyOn(PermissionsAndroid, 'request')
        .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
      await expect(ensureCameraPermission()).resolves.toBe(true);
      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        CAMERA_PERMISSION_RATIONALE,
      );
    });

    it('returns false when camera permission is denied', async () => {
      Object.defineProperty(Platform, 'OS', {value: 'android'});
      jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
      jest
        .spyOn(PermissionsAndroid, 'request')
        .mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
      await expect(ensureCameraPermission()).resolves.toBe(false);
    });
  });

  describe('confirmPhotoLibraryAccess', () => {
    it('resolves true when the user continues', async () => {
      jest
        .spyOn(Alert, 'alert')
        .mockImplementation((_title, _message, buttons) => {
          buttons?.[1]?.onPress?.();
        });
      await expect(confirmPhotoLibraryAccess()).resolves.toBe(true);
      expect(Alert.alert).toHaveBeenCalledWith(
        PHOTO_LIBRARY_RATIONALE.title,
        PHOTO_LIBRARY_RATIONALE.message,
        expect.any(Array),
      );
    });

    it('resolves false when the user cancels', async () => {
      jest
        .spyOn(Alert, 'alert')
        .mockImplementation((_title, _message, buttons) => {
          buttons?.[0]?.onPress?.();
        });
      await expect(confirmPhotoLibraryAccess()).resolves.toBe(false);
    });
  });
});
