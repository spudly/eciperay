import {screen, waitFor} from '@testing-library/react';
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
    // The design system color picker renders its swatches as buttons
    // labelled "Select color <name>" — @spudly/ui 1.15 names colors by
    // their TagColorName (this swatch was "#ef4444" before the bump)
    // and lands the label in a real aria-label.
    const swatch = () => screen.getByRole('button', {name: 'Select color red'});
    expect(swatch()).toBeInTheDocument();
    await userEvent.click(swatch());
    expect(swatch()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: 'Add'})).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByPlaceholderText('Tag name')).toHaveValue('');
  });
});
