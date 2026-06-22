import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {renderWithProviders} from '../../test/testUtils.js';

import {DevelopmentStatusPicker} from './DevelopmentStatusPicker.js';

describe('DevelopmentStatusPicker', () => {
  test('changes development status via select', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    await renderWithProviders(
      <DevelopmentStatusPicker
        value="idea"
        onChange={onChange}
      />,
    );
    await user.selectOptions(
      screen.getByLabelText('Development status'),
      'perfected',
    );
    expect(onChange).toHaveBeenCalledWith('perfected');
  });
});
