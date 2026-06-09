import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {renderWithProviders} from '../../test/testUtils.js';

import {NotesTab} from './NotesTab.js';

describe('NotesTab', () => {
  test('renders notes, chat, and drafts', async () => {
    renderWithProviders(<NotesTab recipeId="recipe-uuid-1" />);
    await waitFor(() => {
      expect(screen.getByText('Great recipe')).toBeInTheDocument();
    });
    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getByText('Added garlic')).toBeInTheDocument();
  });

  test('sends chat message', async () => {
    renderWithProviders(<NotesTab recipeId="recipe-uuid-1" />);
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Ask AI to tweak this recipe…'),
      ).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText('Ask AI to tweak this recipe…');
    await userEvent.type(input, 'Add more garlic');
    await userEvent.click(screen.getByText('↑'));
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  test('creates note and runs cleanup', async () => {
    renderWithProviders(<NotesTab recipeId="recipe-uuid-1" />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add a note…')).toBeInTheDocument();
    });
    await userEvent.type(screen.getByPlaceholderText('Add a note…'), 'My note');
    await userEvent.click(screen.getByText('Save Note'));
    await userEvent.click(screen.getByText('AI Cleanup'));
  });

  test('disables send buttons when input is empty', async () => {
    renderWithProviders(<NotesTab recipeId="recipe-uuid-1" />);
    await waitFor(() => {
      expect(screen.getByText('↑')).toBeDisabled();
    });
    expect(screen.getByText('Save Note')).toBeDisabled();
  });
});
