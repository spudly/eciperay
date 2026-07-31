import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {PageTitle} from './PageTitle';

const TEST_TITLE = 'Hello';

describe('PageTitle', () => {
  test('renders page title text', () => {
    render(<PageTitle>{TEST_TITLE}</PageTitle>);

    expect(screen.getByText(TEST_TITLE)).toBeTruthy();
  });
});
