import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';
import {launchImageLibrary} from 'react-native-image-picker';

import {renderWithProviders} from '../../__tests__/testUtils';

import {RecipeImageField} from './RecipeImageField';

jest.mock('react-native-image-picker', () => ({launchImageLibrary: jest.fn()}));
jest.mock('../../lib/androidPermissions', () => ({
  confirmPhotoLibraryAccess: jest.fn().mockResolvedValue(true),
}));

const mockLaunchImageLibrary = launchImageLibrary as jest.Mock;

describe('RecipeImageField', () => {
  beforeEach(() => {
    mockLaunchImageLibrary.mockReset();
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
});
