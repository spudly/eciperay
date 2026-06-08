import type {Response} from 'express';
import type {AiMessage, RecipeDetail} from '@recipoo/types';

import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {anthropic, HAIKU} from '../../lib/anthropic.js';
import {buildRecipeContext} from '../../lib/buildRecipeContext.js';
import {getParam} from '../../lib/getParam.js';
import {fetchRecipeDetail} from '../../lib/recipeQueries.js';
import {
  AiChatResponseSchema,
  ChatMessageSchema,
  parseAiJson,
  validate,
} from '../../lib/schemas.js';
import {saveDraft} from '../../lib/saveDraft.js';

import {appendMessage, getOrCreateConversation} from './conversation.js';

type QueryFn = typeof defaultQuery;

const SYSTEM = `You are a culinary assistant helping improve recipes. Given a recipe and a user
request, respond with JSON only:
{"reasoning": string, "summary_of_changes": string, "diff": {title?,description?,servings?,
prepTimeMin?,cookTimeMin?,ingredients?,instructions?}}
Return only the fields that change.`;

const buildMessages = (
  recipe: RecipeDetail,
  history: AiMessage[],
  userMessage: string,
) => [
  {role: 'user' as const, content: `Recipe:\n${buildRecipeContext(recipe)}`},
  {
    role: 'assistant' as const,
    content: 'I have reviewed the recipe. How can I help improve it?',
  },
  ...history.map(m => ({role: m.role, content: m.content})),
  {role: 'user' as const, content: userMessage},
];

const createClaudeMessage = (
  recipe: RecipeDetail,
  history: AiMessage[],
  userMessage: string,
) =>
  anthropic.messages.create({
    model: HAIKU,
    max_tokens: 2048,
    system: SYSTEM,
    messages: buildMessages(recipe, history, userMessage),
  });

const callClaude = async (
  recipe: RecipeDetail,
  history: AiMessage[],
  userMessage: string,
) => {
  const response = await createClaudeMessage(recipe, history, userMessage);
  const content = response.content[0];
  /* c8 ignore next */
  if (content?.type !== 'text') {
    throw new Error('Unexpected Claude response');
  }
  return parseAiJson(AiChatResponseSchema, content.text);
};

const makeMessage = (role: AiMessage['role'], content: string): AiMessage => ({
  role,
  content,
  createdAt: new Date().toISOString(),
});

const persistChat = async (
  convoId: string,
  userMessage: string,
  reasoning: string,
  queryFn: QueryFn,
) => {
  await appendMessage(convoId, makeMessage('user', userMessage), queryFn);
  await appendMessage(convoId, makeMessage('assistant', reasoning), queryFn);
};

type ChatOptions = {recipeId: string; userId: string; message: string};

const runChatAndSaveDraft = async (
  recipe: RecipeDetail,
  convo: {id: string; messages: AiMessage[]},
  opts: ChatOptions,
  queryFn: QueryFn,
) => {
  const result = await callClaude(recipe, convo.messages, opts.message);
  await persistChat(convo.id, opts.message, result.reasoning, queryFn);
  const {diff, summary_of_changes: summary} = result;
  const draft = await saveDraft(
    {
      recipeId: opts.recipeId,
      snapshot: recipe,
      diff,
      trigger: 'ai_chat',
      summary,
    },
    queryFn,
  );
  return {draft: draft.rows[0], assistantMessage: result.reasoning};
};

const processChatForRecipe = async (opts: ChatOptions, queryFn: QueryFn) => {
  const recipe = await fetchRecipeDetail(opts.recipeId, opts.userId, queryFn);
  if (!recipe) {
    return null;
  }
  const convo = await getOrCreateConversation(
    opts.recipeId,
    opts.userId,
    queryFn,
  );
  return runChatAndSaveDraft(recipe, convo, opts, queryFn);
};

export const chatRecipe = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(ChatMessageSchema, req, res);
  if (!body.ok) {
    return;
  }
  const opts = {
    recipeId: getParam(req, 'id'),
    userId: req.userId,
    message: body.data.message,
  };
  const result = await processChatForRecipe(opts, queryFn);
  if (!result) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  res.json(result);
};
