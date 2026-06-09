import {fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {renderWithProviders} from '../test/testUtils.js';

import {TagsPage} from './TagsPage.js';

describe('TagsPage', () => {
  test('lists, creates, and deletes tags', async () => {
    await renderWithProviders(<TagsPage />);
    await waitFor(() => {
      expect(screen.getByText('Dinner')).toBeInTheDocument();
    });
    await userEvent.type(screen.getByPlaceholderText('Tag name'), 'Lunch');
    await userEvent.click(screen.getByText('Add'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Tag name')).toHaveValue('');
    });
    const deleteButtons = screen.getAllByText('Delete');
    await userEvent.click(deleteButtons[0]!);
  });

  test('ignores empty tag name and updates color', async () => {
    await renderWithProviders(<TagsPage />);
    await waitFor(() => {
      expect(screen.getByText('Dinner')).toBeInTheDocument();
    });
    const colorInput = screen.getByDisplayValue('#6366f1');
    fireEvent.change(colorInput, {target: {value: '#ff0000'}});
    const form = screen.getByPlaceholderText('Tag name').closest('form')!;
    fireEvent.submit(form);
    expect(screen.getByPlaceholderText('Tag name')).toHaveValue('');
  });
});
