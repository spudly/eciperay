import React from 'react';
import {render} from '@testing-library/react-native';

import {HomeScreen} from './HomeScreen';

describe('HomeScreen', () => {
  test('renders without crashing', () => {
    const {toJSON} = render(<HomeScreen />);
    expect(toJSON()).not.toBeNull();
  });

  test('displays the app name', () => {
    const {getByText} = render(<HomeScreen />);
    expect(getByText('Recipoo')).toBeTruthy();
  });
});
