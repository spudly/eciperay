import React from 'react';
import {fireEvent, waitFor} from '@testing-library/react-native';

import {renderWithProviders} from '../../__tests__/testUtils';
import {api} from '../../lib/api';

import {NotesTab} from './NotesTab';

jest.mock('../../lib/api');

const mockGetConversation = api.ai.getConversation as jest.Mock;
const mockListNotes = api.notes.list as jest.Mock;
const mockListDrafts = api.drafts.listPending as jest.Mock;
const mockChat = api.ai.chat as jest.Mock;
const mockCreateNote = api.notes.create as jest.Mock;
const mockCleanup = api.ai.cleanup as jest.Mock;

const makeConvo = (messages: {role: string; content: string}[] = []) => ({
  messages,
  id: 'c-1',
  recipeId: 'r-1',
  userId: 'u-1',
  createdAt: '',
  updatedAt: '',
});

describe('NotesTab', () => {
  beforeEach(() => {
    mockGetConversation.mockResolvedValue(makeConvo());
    mockListNotes.mockResolvedValue([]);
    mockListDrafts.mockResolvedValue([]);
    mockChat.mockResolvedValue({assistantMessage: 'ok', draft: {}});
    mockCreateNote.mockResolvedValue({});
    mockCleanup.mockResolvedValue({draft: {}});
  });

  test('renders message input placeholder', async () => {
    const {findByPlaceholderText} = renderWithProviders(
      <NotesTab recipeId="r-1" />,
    );
    expect(
      await findByPlaceholderText('Ask AI to tweak this recipe…'),
    ).toBeTruthy();
  });

  test('does not send when message is empty', async () => {
    const {findByText} = renderWithProviders(<NotesTab recipeId="r-1" />);
    const sendBtn = await findByText('↑');
    const callsBefore = mockChat.mock.calls.length;
    fireEvent.press(sendBtn);
    expect(mockChat.mock.calls.length).toBe(callsBefore);
  });

  test('renders notes and drafts from API', async () => {
    mockListNotes.mockResolvedValue([
      {
        id: 'n-1',
        content: 'This was great!',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]);
    mockListDrafts.mockResolvedValue([
      {id: 'd-1', summaryOfChanges: 'Added garlic'},
    ]);
    const {findByText} = renderWithProviders(<NotesTab recipeId="r-1" />);
    expect(await findByText('This was great!')).toBeTruthy();
    expect(await findByText('Added garlic')).toBeTruthy();
  });

  test('sends chat message when send button pressed', async () => {
    const {findByPlaceholderText, getByText} = renderWithProviders(
      <NotesTab recipeId="r-1" />,
    );
    const input = await findByPlaceholderText('Ask AI to tweak this recipe…');
    fireEvent.changeText(input, 'Make it less salty');
    fireEvent.press(getByText('↑'));
    await waitFor(() => {
      expect(mockChat).toHaveBeenCalledWith('r-1', 'Make it less salty');
    });
  });

  test('shows user and assistant message bubbles', async () => {
    mockGetConversation.mockResolvedValue(
      makeConvo([
        {role: 'user', content: 'Hi'},
        {role: 'assistant', content: 'Hello'},
      ]),
    );
    const {findByText} = renderWithProviders(<NotesTab recipeId="r-1" />);
    expect(await findByText('Hi')).toBeTruthy();
    expect(await findByText('Hello')).toBeTruthy();
  });

  test('creates note and runs cleanup', async () => {
    const {findByPlaceholderText, getByText} = renderWithProviders(
      <NotesTab recipeId="r-1" />,
    );
    const noteInput = await findByPlaceholderText('Add a note…');
    fireEvent.changeText(noteInput, 'My note');
    fireEvent.press(getByText('Save Note'));
    fireEvent.press(getByText('AI Cleanup'));
    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalledWith('r-1', 'My note');
      expect(mockCleanup).toHaveBeenCalledWith('r-1');
    });
  });

  test('does not create note when content is empty', async () => {
    const {findByText} = renderWithProviders(<NotesTab recipeId="r-1" />);
    fireEvent.press(await findByText('Save Note'));
    expect(mockCreateNote).not.toHaveBeenCalled();
  });
});
