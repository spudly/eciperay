import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';

import {renderWithProviders} from '../../__tests__/testUtils';

import {RecipeImageField} from './RecipeImageField';

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));
jest.mock('../../lib/androidPermissions', () => ({
  confirmPhotoLibraryAccess: jest.fn().mockResolvedValue(true),
  ensureCameraPermission: jest.fn().mockResolvedValue(true),
}));
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {JPEG: 'jpeg', PNG: 'png'},
}));
jest.mock('../../lib/recipeImageCrop', () => {
  const actual = jest.requireActual('../../lib/recipeImageCrop');
  return {...actual, cropPickedImage: jest.fn()};
});

const {cropPickedImage} = require('../../lib/recipeImageCrop');
const mockCropPickedImage = cropPickedImage as jest.Mock;

const mockLaunchImageLibrary = launchImageLibrary as jest.Mock;
const mockLaunchCamera = launchCamera as jest.Mock;

describe('RecipeImageField', () => {
  beforeEach(() => {
    mockLaunchImageLibrary.mockReset();
    mockLaunchCamera.mockReset();
    mockCropPickedImage.mockReset();
  });

  test('does not open picker when rationale is dismissed', async () => {
    const {confirmPhotoLibraryAccess} = require('../../lib/androidPermissions');
    confirmPhotoLibraryAccess.mockResolvedValueOnce(false);
    const onImagePicked = jest.fn();
    const {getByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={onImagePicked}
        onRemove={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Choose recipe image'));
    await waitFor(() => {
      expect(confirmPhotoLibraryAccess).toHaveBeenCalled();
    });
    expect(mockLaunchImageLibrary).not.toHaveBeenCalled();
    expect(onImagePicked).not.toHaveBeenCalled();
  });

  test('calls onGenerateImage from the generate button', async () => {
    const onGenerateImage = jest.fn();
    const {getByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={jest.fn()}
        onGenerateImage={onGenerateImage}
        onRemove={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Generate image with AI'));
    expect(onGenerateImage).toHaveBeenCalled();
  });

  test('picks an image from the library', async () => {
    const onImagePicked = jest.fn();
    mockLaunchImageLibrary.mockResolvedValue({
      assets: [
        {
          uri: 'file://recipe.png',
          base64: btoa('pixels'),
          type: 'image/png',
          fileSize: 6,
        },
      ],
    });
    const {getByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={onImagePicked}
        onGenerateImage={jest.fn()}
        onRemove={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Choose recipe image'));
    // The picked image is pending until the crop step is skipped or used.
    await waitFor(() => {
      expect(getByLabelText('Use image')).toBeTruthy();
    });
    expect(onImagePicked).not.toHaveBeenCalled();
    await fireEvent.press(getByLabelText('Use image'));
    await waitFor(() => {
      expect(onImagePicked).toHaveBeenCalledWith(
        {base64: btoa('pixels'), contentType: 'image/png'},
        'file://recipe.png',
      );
    });
  });

  test('ignores cancelled library picks', async () => {
    const onImagePicked = jest.fn();
    mockLaunchImageLibrary.mockResolvedValue({didCancel: true});
    const {getByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={onImagePicked}
        onGenerateImage={jest.fn()}
        onRemove={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Choose recipe image'));
    await waitFor(() => {
      expect(onImagePicked).not.toHaveBeenCalled();
    });
  });

  test('disables choose image while an upload is in progress', async () => {
    const {getByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading
        imageError={null}
        onImagePicked={jest.fn()}
        onGenerateImage={jest.fn()}
        onRemove={jest.fn()}
      />,
    );
    expect(
      getByLabelText('Choose recipe image').props.accessibilityState,
    ).toMatchObject({disabled: true});
  });

  test('disables choose image while an image is generating', async () => {
    const {getByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageGenerating
        imageError={null}
        onImagePicked={jest.fn()}
        onGenerateImage={jest.fn()}
        onRemove={jest.fn()}
      />,
    );
    expect(
      getByLabelText('Choose recipe image').props.accessibilityState,
    ).toMatchObject({disabled: true});
  });

  test('ignores assets without a uri', async () => {
    const onImagePicked = jest.fn();
    mockLaunchImageLibrary.mockResolvedValue({
      assets: [{base64: btoa('pixels'), type: 'image/png'}],
    });
    const {getByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={onImagePicked}
        onGenerateImage={jest.fn()}
        onRemove={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Choose recipe image'));
    await waitFor(() => {
      expect(onImagePicked).not.toHaveBeenCalled();
    });
  });

  test('reports invalid picked images', async () => {
    const onImageError = jest.fn();
    mockLaunchImageLibrary.mockResolvedValue({
      assets: [{uri: 'file://recipe.png', type: 'image/png'}],
    });
    const {getByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={jest.fn()}
        onImageError={onImageError}
        onGenerateImage={jest.fn()}
        onRemove={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Choose recipe image'));
    await waitFor(() => {
      expect(onImageError).toHaveBeenCalledWith('Failed to read image');
    });
  });

  test('reports generic pick errors for non-Error failures', async () => {
    const onImageError = jest.fn();
    const onImagePicked = jest.fn().mockRejectedValue('read failed');
    mockLaunchImageLibrary.mockResolvedValue({
      assets: [
        {
          uri: 'file://recipe.png',
          base64: btoa('pixels'),
          type: 'image/png',
          fileSize: 6,
        },
      ],
    });
    const {getByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={onImagePicked}
        onImageError={onImageError}
        onGenerateImage={jest.fn()}
        onRemove={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Choose recipe image'));
    await waitFor(() => {
      expect(getByLabelText('Use image')).toBeTruthy();
    });
    await fireEvent.press(getByLabelText('Use image'));
    await waitFor(() => {
      expect(onImageError).toHaveBeenCalledWith('Failed to read image');
    });
  });

  test('shows uploading label while an upload is in progress', async () => {
    const {getByText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading
        imageError={null}
        onImagePicked={jest.fn()}
        onGenerateImage={jest.fn()}
        onRemove={jest.fn()}
      />,
    );
    expect(getByText('Uploading…')).toBeTruthy();
  });

  test('hides generate button when generation is unavailable', async () => {
    const {queryByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={jest.fn()}
        onRemove={jest.fn()}
      />,
    );
    expect(queryByLabelText('Generate image with AI')).toBeNull();
  });

  test('takes a photo with the camera after permission is granted', async () => {
    const {ensureCameraPermission} = require('../../lib/androidPermissions');
    const onImagePicked = jest.fn();
    mockLaunchCamera.mockResolvedValue({
      assets: [
        {
          uri: 'file://captured.png',
          base64: btoa('pixels'),
          type: 'image/png',
          fileSize: 6,
        },
      ],
    });
    const {getByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={onImagePicked}
        onGenerateImage={jest.fn()}
        onRemove={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Take photo of recipe'));
    await waitFor(() => {
      expect(getByLabelText('Use image')).toBeTruthy();
    });
    await fireEvent.press(getByLabelText('Use image'));
    await waitFor(() => {
      expect(onImagePicked).toHaveBeenCalledWith(
        {base64: btoa('pixels'), contentType: 'image/png'},
        'file://captured.png',
      );
    });
    expect(ensureCameraPermission).toHaveBeenCalled();
    expect(mockLaunchCamera).toHaveBeenCalledWith({
      mediaType: 'photo',
      includeBase64: true,
    });
  });

  test('does not open the camera when permission is denied', async () => {
    const {ensureCameraPermission} = require('../../lib/androidPermissions');
    ensureCameraPermission.mockResolvedValueOnce(false);
    const onImagePicked = jest.fn();
    const {getByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={onImagePicked}
        onRemove={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Take photo of recipe'));
    await waitFor(() => {
      expect(ensureCameraPermission).toHaveBeenCalled();
    });
    expect(mockLaunchCamera).not.toHaveBeenCalled();
    expect(onImagePicked).not.toHaveBeenCalled();
  });

  test('ignores cancelled camera captures', async () => {
    const onImagePicked = jest.fn();
    mockLaunchCamera.mockResolvedValue({didCancel: true});
    const {getByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={onImagePicked}
        onRemove={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Take photo of recipe'));
    await waitFor(() => {
      expect(mockLaunchCamera).toHaveBeenCalled();
    });
    expect(onImagePicked).not.toHaveBeenCalled();
  });

  test('reports camera failures through onImageError', async () => {
    const onImageError = jest.fn();
    const onImagePicked = jest.fn();
    mockLaunchCamera.mockResolvedValue({
      errorCode: 'camera_unavailable',
      errorMessage: 'Camera is unavailable',
    });
    const {getByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={onImagePicked}
        onImageError={onImageError}
        onRemove={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Take photo of recipe'));
    await waitFor(() => {
      expect(onImageError).toHaveBeenCalledWith('Camera is unavailable');
    });
    expect(onImagePicked).not.toHaveBeenCalled();
  });

  test('reports a camera-specific message when the camera is unavailable', async () => {
    const onImageError = jest.fn();
    mockLaunchCamera.mockResolvedValue({errorCode: 'camera_unavailable'});
    const {getByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={jest.fn()}
        onImageError={onImageError}
        onRemove={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Take photo of recipe'));
    await waitFor(() => {
      expect(onImageError).toHaveBeenCalledWith(
        'Camera is unavailable on this device',
      );
    });
  });

  test('reports a thrown camera error through onImageError', async () => {
    const onImageError = jest.fn();
    mockLaunchCamera.mockRejectedValue(new Error('camera exploded'));
    const {getByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={jest.fn()}
        onImageError={onImageError}
        onRemove={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Take photo of recipe'));
    await waitFor(() => {
      expect(onImageError).toHaveBeenCalledWith('camera exploded');
    });
  });

  const pickedAssetWithSize = {
    uri: 'file://recipe.png',
    base64: btoa('pixels'),
    type: 'image/png',
    fileSize: 6,
    width: 1200,
    height: 900,
  };

  test('offers crop on a picked image and passes the cropped image on confirm', async () => {
    const onImagePicked = jest.fn();
    mockLaunchImageLibrary.mockResolvedValue({assets: [pickedAssetWithSize]});
    mockCropPickedImage.mockResolvedValue({
      base64: btoa('cropped'),
      contentType: 'image/png',
      uri: 'file:///cache/cropped.png',
    });
    const {getByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={onImagePicked}
        onRemove={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Choose recipe image'));
    await waitFor(() => {
      expect(getByLabelText('Crop image')).toBeTruthy();
    });
    expect(onImagePicked).not.toHaveBeenCalled();
    await fireEvent.press(getByLabelText('Crop image'));
    await waitFor(() => {
      expect(getByLabelText('Apply crop')).toBeTruthy();
    });
    await fireEvent.press(getByLabelText('Apply crop'));
    await waitFor(() => {
      expect(onImagePicked).toHaveBeenCalledWith(
        {base64: btoa('cropped'), contentType: 'image/png'},
        'file:///cache/cropped.png',
      );
    });
    expect(mockCropPickedImage).toHaveBeenCalledWith(
      'file://recipe.png',
      {x: 0, y: 0, width: 1200, height: 900},
      'image/png',
    );
  });

  test('cancelling crop passes the original asset unchanged', async () => {
    const onImagePicked = jest.fn();
    mockLaunchImageLibrary.mockResolvedValue({assets: [pickedAssetWithSize]});
    const {getByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={onImagePicked}
        onRemove={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Choose recipe image'));
    await waitFor(() => {
      expect(getByLabelText('Crop image')).toBeTruthy();
    });
    await fireEvent.press(getByLabelText('Crop image'));
    await waitFor(() => {
      expect(getByLabelText('Cancel crop')).toBeTruthy();
    });
    await fireEvent.press(getByLabelText('Cancel crop'));
    await waitFor(() => {
      expect(onImagePicked).toHaveBeenCalledWith(
        {base64: btoa('pixels'), contentType: 'image/png'},
        'file://recipe.png',
      );
    });
    expect(mockCropPickedImage).not.toHaveBeenCalled();
  });

  test('a crop failure keeps the crop overlay open with an error', async () => {
    const onImagePicked = jest.fn();
    mockLaunchImageLibrary.mockResolvedValue({assets: [pickedAssetWithSize]});
    mockCropPickedImage.mockRejectedValue(new Error('manipulator failed'));
    const {getByLabelText, getByText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={onImagePicked}
        onRemove={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Choose recipe image'));
    await waitFor(() => {
      expect(getByLabelText('Crop image')).toBeTruthy();
    });
    await fireEvent.press(getByLabelText('Crop image'));
    await fireEvent.press(getByLabelText('Apply crop'));
    await waitFor(() => {
      expect(getByText(/Failed to crop image/)).toBeTruthy();
    });
    expect(onImagePicked).not.toHaveBeenCalled();
  });

  test('when native crop is unavailable, apply crop passes the original asset unchanged', async () => {
    const onImagePicked = jest.fn();
    mockLaunchImageLibrary.mockResolvedValue({assets: [pickedAssetWithSize]});
    // Null = the native manipulator is not registered (#446 Option 3):
    // the crop step falls back to the uncropped image instead of failing.
    mockCropPickedImage.mockResolvedValue(null);
    const {getByLabelText, queryByText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={onImagePicked}
        onRemove={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Choose recipe image'));
    await waitFor(() => {
      expect(getByLabelText('Crop image')).toBeTruthy();
    });
    await fireEvent.press(getByLabelText('Crop image'));
    await fireEvent.press(getByLabelText('Apply crop'));
    await waitFor(() => {
      expect(onImagePicked).toHaveBeenCalledWith(
        {base64: btoa('pixels'), contentType: 'image/png'},
        'file://recipe.png',
      );
    });
    expect(queryByText(/Failed to crop image/)).toBeNull();
  });

  test('discarding a pending image returns to the picker controls', async () => {
    const onImagePicked = jest.fn();
    mockLaunchImageLibrary.mockResolvedValue({assets: [pickedAssetWithSize]});
    const {getByLabelText, queryByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={onImagePicked}
        onRemove={jest.fn()}
      />,
    );
    await fireEvent.press(getByLabelText('Choose recipe image'));
    await waitFor(() => {
      expect(getByLabelText('Discard selected image')).toBeTruthy();
    });
    await fireEvent.press(getByLabelText('Discard selected image'));
    await waitFor(() => {
      expect(getByLabelText('Choose recipe image')).toBeTruthy();
    });
    expect(queryByLabelText('Crop image')).toBeNull();
    expect(onImagePicked).not.toHaveBeenCalled();
  });

  test('reports the pending selection through onPendingChange', async () => {
    const onPendingChange = jest.fn();
    mockLaunchImageLibrary.mockResolvedValue({assets: [pickedAssetWithSize]});
    const {getByLabelText} = await renderWithProviders(
      <RecipeImageField
        imagePreview={null}
        imageUploading={false}
        imageError={null}
        onImagePicked={jest.fn()}
        onPendingChange={onPendingChange}
        onRemove={jest.fn()}
      />,
    );
    expect(onPendingChange).toHaveBeenLastCalledWith(false);
    await fireEvent.press(getByLabelText('Choose recipe image'));
    await waitFor(() => {
      expect(onPendingChange).toHaveBeenLastCalledWith(true);
    });
    await fireEvent.press(getByLabelText('Discard selected image'));
    await waitFor(() => {
      expect(onPendingChange).toHaveBeenLastCalledWith(false);
    });
  });
});
