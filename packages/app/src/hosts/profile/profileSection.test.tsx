import React from 'react';
import {fireEvent} from '@testing-library/react-native';
import {Text} from 'tamagui';

import {renderWithProviders} from '../../__tests__/testUtils';

import {
  LabeledTextInput,
  SectionAlert,
  SectionButton,
  SectionCard,
} from './profileSection';

describe('profileSection', () => {
  test('SectionCard renders its title and children', async () => {
    const {getByText} = await renderWithProviders(
      <SectionCard title="Section title">
        <Text>Section body</Text>
      </SectionCard>,
    );
    expect(getByText('Section title')).toBeTruthy();
    expect(getByText('Section body')).toBeTruthy();
  });

  test('SectionButton reports presses and SectionAlert shows its message', async () => {
    const onPress = jest.fn();
    const {getByText} = await renderWithProviders(
      <>
        <SectionButton
          variant="primary"
          onPress={onPress}
        >
          Do it
        </SectionButton>
        <SectionAlert
          severity="error"
          message="Something failed."
        />
      </>,
    );
    expect(getByText('Something failed.')).toBeTruthy();

    await fireEvent.press(getByText('Do it'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('LabeledTextInput reports text changes', async () => {
    const onChangeText = jest.fn();
    const {getByPlaceholderText} = await renderWithProviders(
      <LabeledTextInput
        label="Token name"
        value=""
        onChangeText={onChangeText}
        placeholder="Name it"
      />,
    );
    await fireEvent.changeText(getByPlaceholderText('Name it'), 'abc');
    expect(onChangeText).toHaveBeenCalledWith('abc');
  });
});
