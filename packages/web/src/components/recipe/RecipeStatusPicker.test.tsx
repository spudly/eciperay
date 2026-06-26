import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {vi} from 'vitest';

import {renderWithProviders} from '../../test/testUtils.js';

import {RecipeStatusPicker} from './RecipeStatusPicker.js';

describe('RecipeStatusPicker', () => {
  test('changes status via select', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    await renderWithProviders(
      <RecipeStatusPicker
        value="idea"
        onChange={onChange}
      />,
    );
    await user.selectOptions(screen.getByLabelText('Status'), 'perfected');
    expect(onChange).toHaveBeenCalledWith('perfected');
  });
});
