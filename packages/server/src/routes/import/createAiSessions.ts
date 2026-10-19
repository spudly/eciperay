/* eslint-disable max-lines -- conversational create session orchestration */
import type {Response} from 'express';
import type {
  RecipeInput,
  CreateAiSession,
  TweakAiMessage,
} from '@eciperay/types';

import {query as defaultQuery} from '../../db/query.js';
import {
  consumeAiCall,
  quotaExhaustedBody,
  refundAiCall,
} from '../../lib/aiMetering.js';
import type {EntitledRequest} from '../../middleware/loadEntitlement.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {anthropic, SONNET} from '../../lib/anthropic.js';
import {prepareImportedRecipeInput} from '../../lib/prepareImportedRecipeInput.js';
import {RecipeImportError} from '../../lib/recipeImportToInput.js';
import {
  RecipeImportSchema,
  TweakAiMessageSchema,
  TweakAiStartSchema,
  parseAiJson,
  validate,
} from '../../lib/schemas.js';
import {
  RecipeNotFoundError,
  saveNewRecipeFromInput,
} from '../../lib/saveRecipeFromInput.js';
import {getParam} from '../../lib/getParam.js';

type QueryFn = typeof defaultQuery;

type SessionRow = {
  id: string;
  user_id: string;
  phase: CreateAiSession['phase'];
  messages: TweakAiMessage[];
  approved_plan: string | null;
  proposed_recipe: Record<string, unknown> | null;
  change_summary: string | null;
  created_at: string;
  updated_at: string;
};

const GET_SESSION_SQL = `
  select *
  from ai_create_sessions
  where id = $1 and user_id = $2
`;

const INSERT_SESSION_SQL = `
  insert into ai_create_sessions (user_id, phase, messages)
  values ($1, 'planning', $2::jsonb)
  returning *
`;

const UPDATE_SESSION_SQL = `
  update ai_create_sessions
  set phase = $3,
      messages = $4::jsonb,
      approved_plan = $5,
      proposed_recipe = $6::jsonb,
      change_summary = $7,
      updated_at = now()
  where id = $1 and user_id = $2
  returning *
`;

const CREATE_PLAN_SYSTEM = `You are a creative recipe developer helping plan a new recipe.
Given the user's request, propose a clear plan for the dish: style, key ingredients,
techniques, timing, and servings. Do NOT output JSON or a full recipe — only a concise,
actionable plan in plain text. If the user asks follow-up questions, refine the plan.`;

const CREATE_IMPLEMENT_SYSTEM = `You are a creative recipe developer. Given an approved plan,
produce a complete recipe as JSON only (no markdown):
{
  "title": string,
  "description": string | null,
  "servings": number,
  "prepTimeMin": number | null,
  "cookTimeMin": number | null,
  "ingredients": [{"sortOrder": number, "name": string, "quantity": number|null, "unit": string|null, "notes": string|null, "isOptional": false}],
  "instructions": [{"stepNumber": number, "body": string}]
}
Follow the approved plan. Default servings to 4 if unspecified.
Number ingredients with sortOrder starting at 0 and steps starting at 1.
Include a brief appetizing description.`;

const mapSessionRow = (row: SessionRow): CreateAiSession => ({
  id: row.id,
  phase: row.phase,
  messages: row.messages,
  approvedPlan: row.approved_plan,
  proposedRecipe: row.proposed_recipe,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const callClaudeText = async (system: string, userContent: string) => {
  const response = await anthropic.messages.create({
    model: SONNET,
    max_tokens: 4096,
    system,
    messages: [{role: 'user', content: userContent}],
  });
  const content = response.content[0];
  if (content?.type !== 'text') {
    throw new Error('Unexpected Claude response');
  }
  return content.text.trim();
};

const fetchOwnedSession = async (
  sessionId: string,
  userId: string,
  queryFn: QueryFn,
) => {
  const result = await queryFn(GET_SESSION_SQL, [sessionId, userId]);
  const row = result.rows[0] as SessionRow | undefined;
  return row ? mapSessionRow(row) : null;
};

const persistSession = async (
  session: SessionRow,
  updates: Partial<
    Pick<
      SessionRow,
      | 'phase'
      | 'messages'
      | 'approved_plan'
      | 'proposed_recipe'
      | 'change_summary'
    >
  >,
  queryFn: QueryFn,
) => {
  const result = await queryFn(UPDATE_SESSION_SQL, [
    session.id,
    session.user_id,
    updates.phase ?? session.phase,
    JSON.stringify(updates.messages ?? session.messages),
    updates.approved_plan === undefined
      ? session.approved_plan
      : updates.approved_plan,
    updates.proposed_recipe === undefined
      ? session.proposed_recipe
        ? JSON.stringify(session.proposed_recipe)
        : null
      : JSON.stringify(updates.proposed_recipe),
    updates.change_summary === undefined
      ? session.change_summary
      : updates.change_summary,
  ]);
  const row = result.rows[0] as SessionRow;
  return mapSessionRow(row);
};

const implementCreateAiSessionCore = async (
  sessionRow: SessionRow,
  approvedPlan: string,
  userId: string,
  queryFn: QueryFn,
): Promise<
  | {error: string; status: number}
  | {session: CreateAiSession; changeSummary: string; preview: RecipeInput}
> => {
  let parsed;
  try {
    const conversation = sessionRow.messages
      .map(message => `${message.role}: ${message.content}`)
      .join('\n');
    const text = await callClaudeText(
      CREATE_IMPLEMENT_SYSTEM,
      `Conversation:\n${conversation}\n\nApproved plan:\n${approvedPlan}`,
    );
    parsed = parseAiJson(RecipeImportSchema, text);
  } catch {
    return {error: 'AI implementation failed', status: 502};
  }

  let input: RecipeInput;
  try {
    input = await prepareImportedRecipeInput({
      recipe: {...parsed, sourceUrl: parsed.sourceUrl ?? null},
      userId,
      queryFn,
    });
  } catch (error) {
    if (error instanceof RecipeImportError) {
      return {error: error.message, status: 422};
    }
    throw error;
  }

  const changeSummary = `AI recipe: ${approvedPlan.slice(0, 200)}`;
  const updated = await persistSession(
    sessionRow,
    {
      phase: 'preview_ready',
      approved_plan: approvedPlan,
      proposed_recipe: input,
      change_summary: changeSummary,
    },
    queryFn,
  );
  return {session: updated, changeSummary, preview: input};
};

export const createCreateAiSession = async (
  req: EntitledRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(TweakAiStartSchema, req, res);
  if (!body.ok) {
    return;
  }

  const quota = await consumeAiCall(req.userId, req.entitlement.plan, queryFn, {
    unlimited: req.entitlement.unlimited,
  });
  if (!quota.ok) {
    res
      .status(402)
      .json(quotaExhaustedBody('ai_quota_exhausted', quota.used, quota.limit));
    return;
  }

  let plan: string;
  try {
    plan = await callClaudeText(
      CREATE_PLAN_SYSTEM,
      `User request: ${body.data.prompt}`,
    );
  } catch {
    await refundAiCall(req.userId, queryFn, quota.periodStart);
    res.status(502).json({error: 'AI planning failed'});
    return;
  }

  const messages: TweakAiMessage[] = [
    {role: 'user', content: body.data.prompt},
    {role: 'assistant', content: plan},
  ];
  const insertResult = await queryFn(INSERT_SESSION_SQL, [
    req.userId,
    JSON.stringify(messages),
  ]);
  const row = insertResult.rows[0] as SessionRow;
  res.status(201).json({session: mapSessionRow(row), plan});
};

export const getCreateAiSession = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const sessionId = getParam(req, 'sessionId');
  const session = await fetchOwnedSession(sessionId, req.userId, queryFn);
  if (!session) {
    res.status(404).json({error: 'Session not found'});
    return;
  }
  res.json({session});
};

export const sendCreateAiMessage = async (
  req: EntitledRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(TweakAiMessageSchema, req, res);
  if (!body.ok) {
    return;
  }
  const sessionId = getParam(req, 'sessionId');
  const session = await fetchOwnedSession(sessionId, req.userId, queryFn);
  if (!session) {
    res.status(404).json({error: 'Session not found'});
    return;
  }
  if (session.phase !== 'planning') {
    res.status(409).json({error: 'Plan already approved or session completed'});
    return;
  }

  const quota = await consumeAiCall(req.userId, req.entitlement.plan, queryFn, {
    unlimited: req.entitlement.unlimited,
  });
  if (!quota.ok) {
    res
      .status(402)
      .json(quotaExhaustedBody('ai_quota_exhausted', quota.used, quota.limit));
    return;
  }

  const messages: TweakAiMessage[] = [
    ...session.messages,
    {role: 'user', content: body.data.content},
  ];
  let reply: string;
  try {
    const conversation = messages
      .map(message => `${message.role}: ${message.content}`)
      .join('\n');
    reply = await callClaudeText(
      CREATE_PLAN_SYSTEM,
      `Conversation so far:\n${conversation}\n\nRespond with an updated plan.`,
    );
  } catch {
    await refundAiCall(req.userId, queryFn, quota.periodStart);
    res.status(502).json({error: 'AI planning failed'});
    return;
  }
  messages.push({role: 'assistant', content: reply});
  const row = await queryFn(GET_SESSION_SQL, [sessionId, req.userId]);
  const updated = await persistSession(
    row.rows[0] as SessionRow,
    {messages},
    queryFn,
  );
  res.json({session: updated, reply});
};

export const approveCreateAiPlan = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const sessionId = getParam(req, 'sessionId');
  const session = await fetchOwnedSession(sessionId, req.userId, queryFn);
  if (!session) {
    res.status(404).json({error: 'Session not found'});
    return;
  }
  if (session.phase !== 'planning') {
    res.status(409).json({error: 'Plan already approved or session completed'});
    return;
  }
  const lastAssistant = [...session.messages]
    .reverse()
    .find(message => message.role === 'assistant');
  if (!lastAssistant) {
    res.status(422).json({error: 'No plan to approve'});
    return;
  }

  const row = await queryFn(GET_SESSION_SQL, [sessionId, req.userId]);
  const result = await implementCreateAiSessionCore(
    row.rows[0] as SessionRow,
    lastAssistant.content,
    req.userId,
    queryFn,
  );
  if ('error' in result) {
    res.status(result.status).json({error: result.error});
    return;
  }
  res.json(result);
};

export const createRecipeFromCreateAiSession = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const sessionId = getParam(req, 'sessionId');
  const session = await fetchOwnedSession(sessionId, req.userId, queryFn);
  if (!session) {
    res.status(404).json({error: 'Session not found'});
    return;
  }
  if (session.phase !== 'preview_ready' || !session.proposedRecipe) {
    res.status(409).json({error: 'No preview ready to save'});
    return;
  }

  const input = session.proposedRecipe as unknown as RecipeInput;
  try {
    const {recipeId, versionId, recipe} = await saveNewRecipeFromInput(
      {userId: req.userId, input, createdVia: 'ai'},
      queryFn,
    );
    const row = await queryFn(GET_SESSION_SQL, [sessionId, req.userId]);
    const updatedSession = await persistSession(
      row.rows[0] as SessionRow,
      {phase: 'completed'},
      queryFn,
    );
    res
      .status(201)
      .json({session: updatedSession, recipeId, versionId, recipe});
  } catch (error) {
    if (error instanceof RecipeImportError) {
      res.status(422).json({error: error.message});
      return;
    }
    /* c8 ignore next 6 -- defensive: validated proposedRecipe can't trigger this */
    if (error instanceof RecipeNotFoundError) {
      res.status(404).json({error: 'Recipe not found'});
      return;
    }
    throw error;
  }
};

export const cancelCreateAiSession = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const sessionId = getParam(req, 'sessionId');
  const session = await fetchOwnedSession(sessionId, req.userId, queryFn);
  if (!session) {
    res.status(404).json({error: 'Session not found'});
    return;
  }
  if (session.phase === 'completed' || session.phase === 'cancelled') {
    res.status(409).json({error: 'Session already finished'});
    return;
  }
  const row = await queryFn(GET_SESSION_SQL, [sessionId, req.userId]);
  const updated = await persistSession(
    row.rows[0] as SessionRow,
    {phase: 'cancelled'},
    queryFn,
  );
  res.json({session: updated});
};
