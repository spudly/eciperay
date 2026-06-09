import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';

import {makeStackProps} from '../__tests__/testUtils';
import type {AddStackParamList} from '../navigation/types';

import {AddScreen} from './AddScreen';

const mockNavigate = jest.fn();
const stackProps = makeStackProps<AddStackParamList, 'AddScreen'>(
  'AddScreen',
  undefined,
  {navigate: mockNavigate},
);

describe('AddScreen', () => {
  test('renders all add options', () => {
    const {getByText} = render(<AddScreen {...stackProps} />);
    expect(getByText('Manual entry')).toBeTruthy();
    expect(getByText('Import from URL')).toBeTruthy();
    expect(getByText('Import from image')).toBeTruthy();
    expect(getByText('Import from text')).toBeTruthy();
  });

  test('navigates to ManualEntry on press', () => {
    const {getByText} = render(<AddScreen {...stackProps} />);
    fireEvent.press(getByText('Manual entry'));
    expect(mockNavigate).toHaveBeenCalledWith('ManualEntry');
  });

  test('navigates to ImportUrl on press', () => {
    const {getByText} = render(<AddScreen {...stackProps} />);
    fireEvent.press(getByText('Import from URL'));
    expect(mockNavigate).toHaveBeenCalledWith('ImportUrl');
  });

  test('navigates to ImportImage on press', () => {
    const {getByText} = render(<AddScreen {...stackProps} />);
    fireEvent.press(getByText('Import from image'));
    expect(mockNavigate).toHaveBeenCalledWith('ImportImage');
  });

  test('navigates to ImportText on press', () => {
    const {getByText} = render(<AddScreen {...stackProps} />);
    fireEvent.press(getByText('Import from text'));
    expect(mockNavigate).toHaveBeenCalledWith('ImportText');
  });
});
