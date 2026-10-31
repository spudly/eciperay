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

  test('renames a tag in place through the inline edit form', async () => {
    await renderWithProviders(<TagsPage />);
    await waitFor(() => {
      expect(screen.getByText('Quick')).toBeInTheDocument();
    });
    // Rows render in list order: Dinner first, Quick second. Quick is
    // the tag the mock API lets the caller update (PATCH 404s others).
    const editButtons = screen.getAllByText('Edit');
    await userEvent.click(editButtons[1]!);
    // The edit form is seeded from the tag: its current name in the
    // field and its current color (green) pressed among the swatches
    // (the second green swatch — the first belongs to the create form).
    const editField = screen.getByDisplayValue('Quick');
    const greenSwatches = screen.getAllByRole('button', {
      name: 'Select color green',
    });
    expect(greenSwatches).toHaveLength(2);
    expect(greenSwatches[1]).toHaveAttribute('aria-pressed', 'true');
    await userEvent.clear(editField);
    await userEvent.type(editField, 'Fast');
    await userEvent.click(screen.getByRole('button', {name: 'Save'}));
    // A successful save closes the edit form (a failed PATCH would
    // leave it open, since only onSuccess clears the edit state).
    await waitFor(() => {
      expect(
        screen.queryByRole('button', {name: 'Save'}),
      ).not.toBeInTheDocument();
    });
    expect(screen.getAllByText('Edit')).toHaveLength(2);
  });

  test('cancelling an edit discards the draft', async () => {
    await renderWithProviders(<TagsPage />);
    await waitFor(() => {
      expect(screen.getByText('Dinner')).toBeInTheDocument();
    });
    const editButtons = screen.getAllByText('Edit');
    await userEvent.click(editButtons[0]!);
    const editField = screen.getByDisplayValue('Dinner');
    await userEvent.clear(editField);
    await userEvent.type(editField, 'Supper');
    await userEvent.click(screen.getByRole('button', {name: 'Cancel'}));
    await waitFor(() => {
      expect(
        screen.queryByRole('button', {name: 'Save'}),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Supper')).not.toBeInTheDocument();
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
