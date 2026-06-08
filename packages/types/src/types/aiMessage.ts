export type AiRole = 'user' | 'assistant';

export type AiMessage = {role: AiRole; content: string; createdAt: string};

export type AiConversation = {
  id: string;
  recipeId: string;
  userId: string;
  messages: AiMessage[];
  createdAt: string;
  updatedAt: string;
};
