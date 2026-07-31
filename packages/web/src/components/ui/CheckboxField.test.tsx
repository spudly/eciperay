import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vitest';

import {CheckboxField} from './CheckboxField.js';

describe('CheckboxField', () => {
  test('renders label and calls onChange', async () => {
    const onChange = vi.fn();

    render(
      <CheckboxField
        checked={false}
        onChange={onChange}
        label="This is a bug"
      />,
    );

    await userEvent.click(
      screen.getByRole('checkbox', {name: 'This is a bug'}),
    );
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
