import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vitest';

import {SelectField} from './SelectField.js';

describe('SelectField', () => {
  test('renders options and calls onChange', async () => {
    const onChange = vi.fn();

    render(
      <SelectField
        label="Status"
        value="a"
        options={[
          {value: 'a', label: 'Option A'},
          {value: 'b', label: 'Option B'},
        ]}
        onChange={onChange}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'b');
    expect(onChange).toHaveBeenCalledWith('b');
  });

  test('uses the shared field background, not plain white', () => {
    render(
      <SelectField
        label="Status"
        value="a"
        options={[{value: 'a', label: 'Option A'}]}
        onChange={vi.fn()}
      />,
    );

    const select = screen.getByLabelText('Status');
    expect(select.className).toContain('bg-field');
    expect(select.className).not.toContain('bg-white');
  });
});
