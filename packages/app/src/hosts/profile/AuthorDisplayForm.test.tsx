import React from 'react';
import {fireEvent} from '@testing-library/react-native';

import {renderWithProviders} from '../../__tests__/testUtils';

import {AuthorDisplayForm} from './AuthorDisplayForm';

const settings = {displayName: 'Chef Alex', showOnPublicRecipes: true};

describe('AuthorDisplayForm', () => {
  test('renders the published-recipes note and reports name edits', async () => {
    const onChange = jest.fn();
    const {getByText, getByDisplayValue} = await renderWithProviders(
      <AuthorDisplayForm
        settings={settings}
        onChange={onChange}
        onSave={jest.fn()}
      />,
    );
    expect(getByText('Author name on public recipes')).toBeTruthy();
    expect(
      getByText(
        'This name will be displayed on published recipes as their author.',
      ),
    ).toBeTruthy();

    await fireEvent.changeText(getByDisplayValue('Chef Alex'), 'Alex S.');
    expect(onChange).toHaveBeenCalledWith({
      ...settings,
      displayName: 'Alex S.',
    });
  });

  test('toggling the visibility checkbox reports the new value', async () => {
    const onChange = jest.fn();
    const {getByText} = await renderWithProviders(
      <AuthorDisplayForm
        settings={settings}
        onChange={onChange}
        onSave={jest.fn()}
      />,
    );

    await fireEvent.press(
      getByText('Show my name as the author on my published recipes'),
    );
    expect(onChange).toHaveBeenCalledWith({
      ...settings,
      showOnPublicRecipes: false,
    });
  });

  test('reflects an initially hidden setting and toggles it back on', async () => {
    const onChange = jest.fn();
    const {getByText} = await renderWithProviders(
      <AuthorDisplayForm
        settings={{...settings, showOnPublicRecipes: false}}
        onChange={onChange}
        onSave={jest.fn()}
      />,
    );

    await fireEvent.press(
      getByText('Show my name as the author on my published recipes'),
    );
    expect(onChange).toHaveBeenCalledWith({
      ...settings,
      showOnPublicRecipes: true,
    });
  });

  test('invokes onSave from the save button and shows errors', async () => {
    const onSave = jest.fn();
    const {getByText} = await renderWithProviders(
      <AuthorDisplayForm
        settings={settings}
        onChange={jest.fn()}
        onSave={onSave}
        error="Could not save author display."
      />,
    );
    expect(getByText('Could not save author display.')).toBeTruthy();

    await fireEvent.press(getByText('Save author display'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
