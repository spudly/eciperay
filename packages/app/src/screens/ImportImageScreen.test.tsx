import React from 'react';
import {Alert} from 'react-native';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {renderWithProviders} from '../__tests__/testUtils';
import {api} from '../lib/api';

import {ImportImageScreen} from './ImportImageScreen';

jest.mock('../lib/api');

const mockImportImage = api.import.importImage as jest.Mock;
const mockLaunchCamera = launchCamera as jest.Mock;
const mockLaunchLibrary = launchImageLibrary as jest.Mock;
const mockNavigate = jest.fn();
const navigation = {navigate: mockNavigate} as never;

const press = (label: string, screen: ReturnType<typeof render>) => {
  act(() => {
    fireEvent.press(screen.getByText(label));
  });
};

describe('ImportImageScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockImportImage.mockReset();
    mockLaunchCamera.mockReset();
    mockLaunchLibrary.mockReset();
    mockImportImage.mockResolvedValue(makeRecipeDetail({id: 'img-1'}));
    mockLaunchCamera.mockResolvedValue({assets: [{base64: 'abc123'}]});
    mockLaunchLibrary.mockResolvedValue({assets: [{base64: 'abc123'}]});
  });

  test('shows importing while processing', async () => {
    let resolveImport!: (value: ReturnType<typeof makeRecipeDetail>) => void;
    mockImportImage.mockReturnValue(
      new Promise(resolve => {
        resolveImport = resolve;
      }),
    );
    const screen = render(
      renderWithProviders(<ImportImageScreen navigation={navigation} />),
    );
    press('Take Photo', screen);
    await waitFor(() => {
      expect(screen.queryByText('Importing…')).toBeTruthy();
    });
    await act(async () => {
      resolveImport(makeRecipeDetail({id: 'img-1'}));
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  test('imports from camera', async () => {
    const screen = render(
      renderWithProviders(<ImportImageScreen navigation={navigation} />),
    );
    press('Take Photo', screen);
    await waitFor(() => {
      expect(mockLaunchCamera).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ImportReview', {
        recipeId: 'img-1',
      });
    });
  });

  test('imports from library', async () => {
    const screen = render(
      renderWithProviders(<ImportImageScreen navigation={navigation} />),
    );
    press('Choose from Library', screen);
    await waitFor(() => {
      expect(mockLaunchLibrary).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockImportImage).toHaveBeenCalledWith('abc123');
    });
  });

  test('ignores picker with no assets', async () => {
    mockLaunchCamera.mockResolvedValue({assets: []});
    const screen = render(
      renderWithProviders(<ImportImageScreen navigation={navigation} />),
    );
    press('Take Photo', screen);
    await waitFor(() => {
      expect(mockLaunchCamera).toHaveBeenCalled();
    });
    expect(mockImportImage).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('ignores cancelled picker', async () => {
    mockLaunchCamera.mockResolvedValue({didCancel: true});
    const screen = render(
      renderWithProviders(<ImportImageScreen navigation={navigation} />),
    );
    press('Take Photo', screen);
    await waitFor(() => {
      expect(mockLaunchCamera).toHaveBeenCalled();
    });
    expect(mockImportImage).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('imports when base64 is missing on asset', async () => {
    mockLaunchLibrary.mockResolvedValue({assets: [{}]});
    const screen = render(
      renderWithProviders(<ImportImageScreen navigation={navigation} />),
    );
    press('Choose from Library', screen);
    await waitFor(() => {
      expect(mockImportImage).toHaveBeenCalledWith('');
    });
  });

  test('shows generic error on non-Error failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockReturnValue();
    mockImportImage.mockRejectedValue('nope');
    const screen = render(
      renderWithProviders(<ImportImageScreen navigation={navigation} />),
    );
    press('Choose from Library', screen);
    await waitFor(() => {
      expect(screen.getByText('Import failed')).toBeTruthy();
    });
    expect(alertSpy).toHaveBeenCalled();
  });

  test('shows alert on import failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockReturnValue();
    mockImportImage.mockRejectedValue(new Error('Import failed'));
    const screen = render(
      renderWithProviders(<ImportImageScreen navigation={navigation} />),
    );
    press('Choose from Library', screen);
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });
  });
});
