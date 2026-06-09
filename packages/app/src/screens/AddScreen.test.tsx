import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';

import {AddScreen} from './AddScreen';

const mockNavigate = jest.fn();
const nav = {navigate: mockNavigate};

describe('AddScreen', () => {
  test('renders all 3 add options', () => {
    const {getByText} = render(<AddScreen navigation={nav} />);
    expect(getByText('Manual entry')).toBeTruthy();
    expect(getByText('Import from URL')).toBeTruthy();
    expect(getByText('Import from image')).toBeTruthy();
  });

  test('navigates to ManualEntry on press', () => {
    const {getByText} = render(<AddScreen navigation={nav} />);
    fireEvent.press(getByText('Manual entry'));
    expect(mockNavigate).toHaveBeenCalledWith('ManualEntry');
  });

  test('navigates to ImportUrl on press', () => {
    const {getByText} = render(<AddScreen navigation={nav} />);
    fireEvent.press(getByText('Import from URL'));
    expect(mockNavigate).toHaveBeenCalledWith('ImportUrl');
  });

  test('navigates to ImportImage on press', () => {
    const {getByText} = render(<AddScreen navigation={nav} />);
    fireEvent.press(getByText('Import from image'));
    expect(mockNavigate).toHaveBeenCalledWith('ImportImage');
  });
});
