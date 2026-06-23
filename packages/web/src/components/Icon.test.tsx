import {screen} from '@testing-library/react';

import {renderWithProviders} from '../test/testUtils.js';

import {Icon} from './Icon.js';

describe('Icon', () => {
  test('renders a feather icon', async () => {
    const {container} = await renderWithProviders(
      <Icon
        name="home"
        aria-label="Home"
      />,
    );
    expect(screen.getByLabelText('Home')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
