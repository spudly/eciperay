import React from 'react';
import {Alert} from 'react-native';
import {fireEvent, render, waitFor} from '@testing-library/react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {makeStackProps, renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';
import type {AddStackParamList} from '../navigation/types';

import {ImportImageScreen} from './ImportImageScreen';

jest.mock('../lib/api');

const mockImportImage = api.import.importImage as jest.Mock;
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
    mockImportImage.mockResolvedValue(makeRecipeDetail({id: 'img-1'}));
    mockLaunchCamera.mockResolvedValue({assets: [{base64: 'abc123'}]});
    mockLaunchLibrary.mockResolvedValue({assets: [{base64: 'abc123'}]});
  });

  test('imports from camera', async () => {
    const {getByText} = render(
      renderWithProviders(<ImportImageScreen {...stackProps} />),
    );
    fireEvent.press(getByText('Take Photo'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ImportReview', {
        recipeId: 'img-1',
      });
    });
    expect(mockLaunchCamera).toHaveBeenCalled();
  });

  test('imports from library', async () => {
    const {getByText} = render(
      renderWithProviders(<ImportImageScreen {...stackProps} />),
    );
    fireEvent.press(getByText('Choose from Library'));
    await waitFor(() => {
      expect(mockImportImage).toHaveBeenCalledWith('abc123');
    });
    expect(mockLaunchLibrary).toHaveBeenCalled();
  });

  test('ignores picker with no assets', async () => {
    mockLaunchCamera.mockResolvedValue({assets: []});
    const {getByText} = render(
      renderWithProviders(<ImportImageScreen {...stackProps} />),
    );
    fireEvent.press(getByText('Take Photo'));
    await waitFor(() => {
      expect(mockLaunchCamera).toHaveBeenCalled();
    });
    expect(mockImportImage).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('ignores cancelled picker', async () => {
    mockLaunchCamera.mockResolvedValue({didCancel: true});
    const {getByText} = render(
      renderWithProviders(<ImportImageScreen {...stackProps} />),
    );
    fireEvent.press(getByText('Take Photo'));
    await waitFor(() => {
      expect(mockLaunchCamera).toHaveBeenCalled();
    });
    expect(mockImportImage).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('imports when base64 is missing on asset', async () => {
    mockLaunchLibrary.mockResolvedValue({assets: [{}]});
    const {getByText} = render(
      renderWithProviders(<ImportImageScreen {...stackProps} />),
    );
    fireEvent.press(getByText('Choose from Library'));
    await waitFor(() => {
      expect(mockImportImage).toHaveBeenCalledWith('');
    });
  });

  test('shows generic error on non-Error failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockReturnValue();
    mockImportImage.mockRejectedValue('nope');
    const {getByText, findByText} = render(
      renderWithProviders(<ImportImageScreen {...stackProps} />),
    );
    fireEvent.press(getByText('Choose from Library'));
    expect(await findByText('Import failed')).toBeTruthy();
    expect(alertSpy).toHaveBeenCalled();
  });

  test('shows alert on import failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockReturnValue();
    mockImportImage.mockRejectedValue(new Error('Import failed'));
    const {getByText} = render(
      renderWithProviders(<ImportImageScreen {...stackProps} />),
    );
    fireEvent.press(getByText('Choose from Library'));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
  });
});
