import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {renderWithProviders} from '../../test/testUtils.js';

import {TagPicker} from './TagPicker.js';

describe('TagPicker', () => {
  test('loads and toggles tags', async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <TagPicker
        selectedIds={[]}
        onChange={onChange}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Dinner')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Dinner'));
    expect(onChange).toHaveBeenCalledWith(['tag-1']);
  });

  test('deselects tag', async () => {
    const onChange = vi.fn();
    renderWithProviders(
      <TagPicker
        selectedIds={['tag-1']}
        onChange={onChange}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('Dinner')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('Dinner'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
