import type {AiConversation, AiMessage} from '@eciperay/types';

export const makeAiMessage = (
  overrides: Partial<AiMessage> = {},
): AiMessage => ({
  role: 'user',
  content: 'How can I make this less salty?',
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

export const makeAiConversation = (
  overrides: Partial<AiConversation> = {},
): AiConversation => ({
  id: 'conversation-uuid-1',
  recipeId: 'recipe-uuid-1',
  userId: 'user-uuid-1',
  messages: [makeAiMessage()],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});
