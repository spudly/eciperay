import type {AiMessage} from '@recipoo/types';

import {query as defaultQuery} from '../../db/query.js';

type QueryFn = typeof defaultQuery;
type ConversationRow = {
  id: string;
  recipe_id: string;
  user_id: string;
  messages: AiMessage[];
  created_at: string;
  updated_at: string;
};

const UPSERT_SQL = `
  insert into ai_conversations (recipe_id, user_id, messages)
  values ($1, $2, '[]')
  on conflict (recipe_id, user_id)
  do update set updated_at = now()
  returning id, recipe_id, user_id, messages, created_at, updated_at
`;

const requireRow = (row: ConversationRow | undefined): ConversationRow => {
  if (!row) {
    throw new Error('Failed to upsert conversation');
  }
  return row;
};

export const getOrCreateConversation = async (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
) => {
  const result = await queryFn<ConversationRow>(UPSERT_SQL, [recipeId, userId]);
  return requireRow(result.rows[0]);
};

export const appendMessage = (
  conversationId: string,
  message: AiMessage,
  queryFn: QueryFn,
) =>
  queryFn(
    `update ai_conversations set messages = messages || $2::jsonb where id = $1`,
    [conversationId, JSON.stringify(message)],
  );
