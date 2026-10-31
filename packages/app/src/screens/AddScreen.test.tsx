import React from 'react';
import {Linking} from 'react-native';
import {fireEvent} from '@testing-library/react-native';

import {renderWithProviders} from '../__tests__/testUtils';
import {addOptionHrefs} from '../lib/deepLinks';

import {AddScreen} from './AddScreen';

// The menu options are links now (#248): the DS page renders each
// option as a link carrying its deep-link href, exposed to tests as a
// link-role element whose accessible name is "label, description";
// on native a link press opens the URL through Linking — the
// navigation container's linking config routes it to the same
// screens the old press callbacks navigated to.
describe('AddScreen', () => {
  let openURLSpy: jest.SpyInstance;

  beforeEach(() => {
    openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    openURLSpy.mockRestore();
  });

  test('renders all add options', async () => {
    const {getByRole} = await renderWithProviders(<AddScreen />);
    expect(
      getByRole('link', {name: 'Manual entry, Type your recipe from scratch'}),
    ).toBeTruthy();
    expect(
      getByRole('link', {
        name: 'Import from URL, Paste a link to any recipe website',
      }),
    ).toBeTruthy();
    expect(
      getByRole('link', {
        name: 'Import from image, Take a photo or use your library',
      }),
    ).toBeTruthy();
    expect(
      getByRole('link', {
        name: 'Import from text, Paste rich text from Word or the web',
      }),
    ).toBeTruthy();
    expect(
      getByRole('link', {
        name: 'Generate with AI, Describe the recipe you want and let AI create it',
      }),
    ).toBeTruthy();
  });

  test('opens the manual-entry deep link on press', async () => {
    const {getByRole} = await renderWithProviders(<AddScreen />);
    await fireEvent.press(
      getByRole('link', {name: 'Manual entry, Type your recipe from scratch'}),
    );
    expect(Linking.openURL).toHaveBeenCalledWith(addOptionHrefs.manual);
  });

  test('opens the import-URL deep link on press', async () => {
    const {getByRole} = await renderWithProviders(<AddScreen />);
    await fireEvent.press(
      getByRole('link', {
        name: 'Import from URL, Paste a link to any recipe website',
      }),
    );
    expect(Linking.openURL).toHaveBeenCalledWith(addOptionHrefs.url);
  });

  test('opens the import-image deep link on press', async () => {
    const {getByRole} = await renderWithProviders(<AddScreen />);
    await fireEvent.press(
      getByRole('link', {
        name: 'Import from image, Take a photo or use your library',
      }),
    );
    expect(Linking.openURL).toHaveBeenCalledWith(addOptionHrefs.image);
  });

  test('opens the import-text deep link on press', async () => {
    const {getByRole} = await renderWithProviders(<AddScreen />);
    await fireEvent.press(
      getByRole('link', {
        name: 'Import from text, Paste rich text from Word or the web',
      }),
    );
    expect(Linking.openURL).toHaveBeenCalledWith(addOptionHrefs.text);
  });

  test('opens the generate-with-AI deep link on press', async () => {
    const {getByRole} = await renderWithProviders(<AddScreen />);
    await fireEvent.press(
      getByRole('link', {
        name: 'Generate with AI, Describe the recipe you want and let AI create it',
      }),
    );
    expect(Linking.openURL).toHaveBeenCalledWith(addOptionHrefs.ai);
  });
});
