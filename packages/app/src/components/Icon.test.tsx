import React from 'react';
import {render} from '@testing-library/react-native';

import {Icon} from './Icon';

describe('Icon', () => {
  test('renders a feather icon with label', () => {
    const {getByLabelText} = render(
      <Icon
        name="home"
        accessibilityLabel="Home"
      />,
    );
    expect(getByLabelText('Home')).toBeTruthy();
  });
});
