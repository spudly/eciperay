import React from 'react';
import {Alert} from 'react-native';
import {fireEvent, waitFor} from '@testing-library/react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import {
  confirmPhotoLibraryAccess,
  ensureCameraPermission,
} from '../lib/androidPermissions';
import type {AddStackParamList} from '../navigation/types';

import {ImportImageScreen} from './ImportImageScreen';

jest.mock('../lib/api');
jest.mock('../lib/androidPermissions', () => ({
  ensureCameraPermission: jest.fn().mockResolvedValue(true),
  confirmPhotoLibraryAccess: jest.fn().mockResolvedValue(true),
}));

const mockImportImage = api.import.importImage as jest.Mock;
const mockEnsureCameraPermission = ensureCameraPermission as jest.Mock;
const mockConfirmPhotoLibraryAccess = confirmPhotoLibraryAccess as jest.Mock;
const mockLaunchCamera = launchCamera as jest.Mock;
const mockLaunchLibrary = launchImageLibrary as jest.Mock;
const mockNavigate = jest.fn();
const stackProps = makeStackProps<AddStackParamList, 'ImportImage'>(
  'ImportImage',
  undefined,
  {navigate: mockNavigate},
);

describe('ImportImageScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockImportImage.mockClear();
    mockLaunchCamera.mockClear();
    mockLaunchLibrary.mockClear();
    mockEnsureCameraPermission.mockResolvedValue(true);
    mockConfirmPhotoLibraryAccess.mockResolvedValue(true);
    mockImportImage.mockResolvedValue(makeRecipeDetail({id: 'img-1'}));
    mockLaunchCamera.mockResolvedValue({assets: [{base64: 'abc123'}]});
    mockLaunchLibrary.mockResolvedValue({assets: [{base64: 'abc123'}]});
  });

  test('does not open camera when permission is denied', async () => {
    mockEnsureCameraPermission.mockResolvedValue(false);
    const {getByText} = await renderWithProviders(
      <ImportImageScreen {...stackProps} />,
    );
    await fireEvent.press(getByText('Take Photo'));
    await waitFor(() => {
      expect(mockEnsureCameraPermission).toHaveBeenCalled();
    });
    expect(mockLaunchCamera).not.toHaveBeenCalled();
  });

  test('does not open library when rationale is dismissed', async () => {
    mockConfirmPhotoLibraryAccess.mockResolvedValue(false);
    const {getByText} = await renderWithProviders(
      <ImportImageScreen {...stackProps} />,
    );
    await fireEvent.press(getByText('Choose from Library'));
    await waitFor(() => {
      expect(mockConfirmPhotoLibraryAccess).toHaveBeenCalled();
    });
    expect(mockLaunchLibrary).not.toHaveBeenCalled();
  });

  test('shows loading state while importing', async () => {
    let resolveImport!: (value: ReturnType<typeof makeRecipeDetail>) => void;
    mockImportImage.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveImport = resolve;
        }),
    );
    const {getByText, findByText} = await renderWithProviders(
      <ImportImageScreen {...stackProps} />,
    );
    await fireEvent.press(getByText('Choose from Library'));
    expect(await findByText('Importing…')).toBeTruthy();
    resolveImport(makeRecipeDetail({id: 'img-1'}));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ImportReview', {
        recipeId: 'img-1',
      });
    });
  });

  test('imports from camera', async () => {
    const {getByText} = await renderWithProviders(
      <ImportImageScreen {...stackProps} />,
    );
    await fireEvent.press(getByText('Take Photo'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ImportReview', {
        recipeId: 'img-1',
      });
    });
    expect(mockLaunchCamera).toHaveBeenCalled();
  });

  test('warns on a duplicate capture, then imports it anyway on re-press (#296)', async () => {
    const duplicateError = Object.assign(
      new Error(
        'This recipe already exists in your library as "Cake". Import anyway to create a second copy.',
      ),
      {code: 'duplicate_recipe'},
    );
    mockImportImage
      .mockRejectedValueOnce(duplicateError)
      .mockResolvedValue(makeRecipeDetail({id: 'img-2'}));
    const alertSpy = jest.spyOn(Alert, 'alert').mockReturnValue();
    const {getByText, findByText} = await renderWithProviders(
      <ImportImageScreen {...stackProps} />,
    );
    await fireEvent.press(getByText('Take Photo'));
    expect(await findByText(/already exists in your library/)).toBeTruthy();
    // A duplicate warning is not surfaced as a failure alert.
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockImportImage).toHaveBeenLastCalledWith('abc123', {
      allowDuplicate: false,
    });
    // Pressing the same source again resubmits the retained capture with
    // the override — no new camera capture is launched.
    mockLaunchCamera.mockClear();
    await fireEvent.press(getByText('Take Photo'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ImportReview', {
        recipeId: 'img-2',
      });
    });
    expect(mockLaunchCamera).not.toHaveBeenCalled();
    expect(mockImportImage).toHaveBeenLastCalledWith('abc123', {
      allowDuplicate: true,
    });
    alertSpy.mockRestore();
  });

  test('imports from library', async () => {
    const {getByText} = await renderWithProviders(
      <ImportImageScreen {...stackProps} />,
    );
    await fireEvent.press(getByText('Choose from Library'));
    await waitFor(() => {
      expect(mockImportImage).toHaveBeenCalledWith('abc123', {
        allowDuplicate: false,
      });
    });
    expect(mockLaunchLibrary).toHaveBeenCalled();
  });

  test('ignores picker with no assets', async () => {
    mockLaunchCamera.mockResolvedValue({assets: []});
    const {getByText} = await renderWithProviders(
      <ImportImageScreen {...stackProps} />,
    );
    await fireEvent.press(getByText('Take Photo'));
    await waitFor(() => {
      expect(mockLaunchCamera).toHaveBeenCalled();
    });
    expect(mockImportImage).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('ignores cancelled picker', async () => {
    mockLaunchCamera.mockResolvedValue({didCancel: true});
    const {getByText} = await renderWithProviders(
      <ImportImageScreen {...stackProps} />,
    );
    await fireEvent.press(getByText('Take Photo'));
    await waitFor(() => {
      expect(mockLaunchCamera).toHaveBeenCalled();
    });
    expect(mockImportImage).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('imports when base64 is missing on asset', async () => {
    mockLaunchLibrary.mockResolvedValue({assets: [{}]});
    const {getByText} = await renderWithProviders(
      <ImportImageScreen {...stackProps} />,
    );
    await fireEvent.press(getByText('Choose from Library'));
    await waitFor(() => {
      expect(mockImportImage).toHaveBeenCalledWith('', {
        allowDuplicate: false,
      });
    });
  });

  test('shows generic error on non-Error failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockReturnValue();
    mockImportImage.mockRejectedValue('nope');
    const {getByText, findByText} = await renderWithProviders(
      <ImportImageScreen {...stackProps} />,
    );
    await fireEvent.press(getByText('Choose from Library'));
    expect(await findByText('Import failed')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalled();
  });

  test('shows alert on import failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockReturnValue();
    mockImportImage.mockRejectedValue(new Error('Import failed'));
    const {getByText} = await renderWithProviders(
      <ImportImageScreen {...stackProps} />,
    );
    await fireEvent.press(getByText('Choose from Library'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
  });
});
