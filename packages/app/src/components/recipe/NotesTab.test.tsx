import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

import {apiFetch} from '../../lib/api';

import {NotesTab} from './NotesTab';

jest.mock('../../lib/api', () => ({apiFetch: jest.fn()}));

const mockApiFetch = apiFetch as jest.Mock;
const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
      },
    },
  });

let queryClient: QueryClient;

const wrap = (element: React.ReactElement) => (
  <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>
);

type Message = {role: string; content: string; createdAt: string};

const makeConvo = (messages: Message[] = []) => ({
  messages,
  id: 'c-1',
  recipeId: 'r-1',
  userId: 'u-1',
  createdAt: '',
  updatedAt: '',
});

// Return the correct shape based on which URL is called.
// Both the conversation query (/ai/conversation) and notes query (/notes)
// share the same apiFetch mock, so we must distinguish by URL.
const defaultApiFetch = () =>
  mockApiFetch.mockImplementation((url: string) =>
    url.includes('/notes') ? Promise.resolve([]) : Promise.resolve(makeConvo()),
  );

describe('NotesTab', () => {
  beforeEach(() => {
    queryClient = makeQueryClient();
    defaultApiFetch();
  });

  test('renders message input placeholder', async () => {
    const {findByPlaceholderText} = render(wrap(<NotesTab recipeId="r-1" />));
    expect(
      await findByPlaceholderText('Ask AI to tweak this recipe…'),
    ).toBeTruthy();
  });

  test('does not send when message is empty', async () => {
    const {findByText} = render(wrap(<NotesTab recipeId="r-1" />));
    const sendBtn = await findByText('↑');
    const callsBefore = mockApiFetch.mock.calls.length;
    fireEvent.press(sendBtn);
    expect(mockApiFetch.mock.calls.length).toBe(callsBefore);
  });

  test('renders notes from API', async () => {
    mockApiFetch.mockImplementation((url: string) =>
      url.includes('/notes')
        ? Promise.resolve([
            {
              id: 'n-1',
              content: 'This was great!',
              createdAt: '2024-01-01T00:00:00Z',
            },
          ])
        : Promise.resolve(makeConvo()),
    );
    const {findByText} = render(wrap(<NotesTab recipeId="r-1" />));
    expect(await findByText('This was great!')).toBeTruthy();
  });

  test('sends chat message when send button pressed', async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes('/notes')) return Promise.resolve([]);
      if (url.includes('/ai/chat'))
        return Promise.resolve({assistantMessage: 'Try less salt', draft: {}});
      return Promise.resolve(makeConvo());
    });
    const {findByPlaceholderText, getByText} = render(
      wrap(<NotesTab recipeId="r-1" />),
    );
    const input = await findByPlaceholderText('Ask AI to tweak this recipe…');
    fireEvent.changeText(input, 'Make it less salty');
    fireEvent.press(getByText('↑'));
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai/chat'),
        expect.any(Object),
      );
    });
  });

  test('shows AI message bubble from conversation history', async () => {
    const messages = [
      {role: 'assistant', content: 'Try less salt', createdAt: ''},
    ];
    mockApiFetch.mockImplementation((url: string) =>
      url.includes('/notes')
        ? Promise.resolve([])
        : Promise.resolve(makeConvo(messages)),
    );
    const {findByText} = render(wrap(<NotesTab recipeId="r-1" />));
    expect(await findByText('Try less salt')).toBeTruthy();
  });

  test('shows user message bubble alongside assistant message', async () => {
    const messages = [
      {role: 'user', content: 'Make it less salty', createdAt: ''},
      {role: 'assistant', content: 'Try less salt', createdAt: ''},
    ];
    mockApiFetch.mockImplementation((url: string) =>
      url.includes('/notes')
        ? Promise.resolve([])
        : Promise.resolve(makeConvo(messages)),
    );
    const {findByText} = render(wrap(<NotesTab recipeId="r-1" />));
    expect(await findByText('Make it less salty')).toBeTruthy();
  });
});
