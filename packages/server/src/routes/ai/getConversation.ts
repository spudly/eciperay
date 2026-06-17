import type {Response} from 'express';
import type {AiConversation} from '@eciperay/types';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {getParam} from '../../lib/getParam.js';

import {getOrCreateConversation} from './conversation.js';

type QueryFn = typeof defaultQuery;

type ConversationRow = {
  id: string;
  recipe_id: string;
  user_id: string;
  messages: AiConversation['messages'];
  created_at: string;
  updated_at: string;
};

const mapRowToConversation = (row: ConversationRow): AiConversation => ({
  id: row.id,
  recipeId: row.recipe_id,
  userId: row.user_id,
  messages: row.messages,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const getConversation = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const convo = await getOrCreateConversation(
    getParam(req, 'id'),
    req.userId,
    queryFn,
  );
  res.json(mapRowToConversation(convo));
};
