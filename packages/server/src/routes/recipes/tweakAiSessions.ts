/* eslint-disable max-lines -- conversational tweak session orchestration */
import type {Response} from 'express';
import type {
  RecipeInput,
  TweakAiMessage,
  TweakAiSession,
} from '@eciperay/types';
import type {z} from 'zod';

import {runTransactional} from '../../db/withTransaction.js';
import {query as defaultQuery} from '../../db/query.js';
import type {AuthedRequest} from '../../middleware/requireAuth.js';
import {anthropic, SONNET} from '../../lib/anthropic.js';
import {
  isRecipeEditable,
  recipeEditBlockedError,
} from '../../lib/assertRecipeEditable.js';
import {buildTweakContext} from '../../lib/buildRecipeContext.js';
import {fetchVersionDetail} from '../../lib/fetchVersionDetail.js';
import {getParam} from '../../lib/getParam.js';
import {
  ingredientsOrInstructionsChanged,
  preserveTweakDescription,
} from '../../lib/preserveTweakDescription.js';
import {prepareImportedRecipeInput} from '../../lib/prepareImportedRecipeInput.js';
import {fetchRecipeDetail} from '../../lib/recipeQueries.js';
import {RecipeImportError} from '../../lib/recipeImportToInput.js';
import {
  RecipeImportSchema,
  TweakAiMessageSchema,
  TweakAiStartSchema,
  parseAiJson,
  validate,
} from '../../lib/schemas.js';
import {mapRowToCookLog} from '../cooks/mapRowToCookLog.js';

import {insertIngredients, insertInstructions, linkTags} from './queries.js';
import {
  buildVersionOptions,
  getNextVersionNumber,
  insertVersion,
  setLineageStatus,
} from './versionQueries.js';

type QueryFn = typeof defaultQuery;

type SessionRow = {
  id: string;
  recipe_id: string;
  user_id: string;
  phase: TweakAiSession['phase'];
  messages: TweakAiMessage[];
  approved_plan: string | null;
  proposed_recipe: Record<string, unknown> | null;
  parent_version_id: string;
  change_summary: string | null;
  created_at: string;
  updated_at: string;
};

const LIST_COOK_LOGS_SQL = `
  select cl.*
  from cook_logs cl
  where cl.recipe_version_id = $1
  order by cl.cooked_at desc
`;

const GET_SESSION_SQL = `
  select *
  from ai_tweak_sessions
  where id = $1 and recipe_id = $2 and user_id = $3
`;

const INSERT_SESSION_SQL = `
  insert into ai_tweak_sessions (
    recipe_id, user_id, phase, messages, parent_version_id
  ) values ($1, $2, 'planning', $3::jsonb, $4)
  returning *
`;

const UPDATE_SESSION_SQL = `
  update ai_tweak_sessions
  set phase = $4,
      messages = $5::jsonb,
      approved_plan = $6,
      proposed_recipe = $7::jsonb,
      change_summary = $8,
      updated_at = now()
  where id = $1 and recipe_id = $2 and user_id = $3
  returning *
`;

const PLAN_SYSTEM = `You are a culinary assistant helping plan recipe tweaks.
Given the recipe, cook log feedback, and the user's request, propose a clear plan
describing what will change (ingredients, steps, times, servings) and why.
Do NOT output JSON or a full recipe — only a concise, actionable plan in plain text.
If the user asks follow-up questions, refine the plan.`;

const IMPLEMENT_SYSTEM = `You are a culinary assistant. Given a recipe, cook logs, and an approved plan,
produce a complete updated recipe as JSON only (no markdown):
{
  "title": string,
  "description": string | null,
  "servings": number,
  "prepTimeMin": number | null,
  "cookTimeMin": number | null,
  "ingredients": [{"sortOrder": number, "name": string, "quantity": number|null, "unit": string|null, "notes": string|null, "isOptional": false}],
  "instructions": [{"stepNumber": number, "body": string}]
}
Follow the approved plan. Keep the description as a appetizing summary — not a changelog.
Number ingredients with sortOrder starting at 0 and steps starting at 1.`;

const mapSessionRow = (row: SessionRow): TweakAiSession => ({
  id: row.id,
  recipeId: row.recipe_id,
  phase: row.phase,
  messages: row.messages,
  approvedPlan: row.approved_plan,
  proposedRecipe: row.proposed_recipe,
  parentVersionId: row.parent_version_id,
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

type SessionContextError = {error: string; status: number};
type SessionContextSuccess = {
  recipe: NonNullable<Awaited<ReturnType<typeof fetchRecipeDetail>>>;
  parentVersion: NonNullable<Awaited<ReturnType<typeof fetchVersionDetail>>>;
  context: string;
};

const loadSessionContext = async (
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
): Promise<SessionContextError | SessionContextSuccess> => {
  const recipe = await fetchRecipeDetail(recipeId, userId, queryFn);
  if (!recipe) {
    return {error: 'Recipe not found' as const, status: 404};
  }
  if (!isRecipeEditable(recipe.status)) {
    return {error: recipeEditBlockedError(), status: 409};
  }
  const parentVersion = await fetchVersionDetail(
    recipe.versionId,
    recipeId,
    userId,
    queryFn,
  );
  if (!parentVersion) {
    return {error: 'Active version not found' as const, status: 404};
  }
  const cookLogResult = await queryFn(LIST_COOK_LOGS_SQL, [recipe.versionId]);
  const cookLogs = cookLogResult.rows.map(row =>
    mapRowToCookLog(row as Parameters<typeof mapRowToCookLog>[0]),
  );
  const context = buildTweakContext(parentVersion, cookLogs);
  return {recipe, parentVersion, context};
};

const fetchOwnedSession = async (
  sessionId: string,
  recipeId: string,
  userId: string,
  queryFn: QueryFn,
) => {
  const result = await queryFn(GET_SESSION_SQL, [sessionId, recipeId, userId]);
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
    session.recipe_id,
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

const recipeInputFromParsed = async ({
  parsed,
  parentVersion,
  recipe,
  userId,
  queryFn,
}: {
  parsed: z.infer<typeof RecipeImportSchema>;
  parentVersion: SessionContextSuccess['parentVersion'];
  recipe: RecipeInput;
  userId: string;
  queryFn: QueryFn;
}): Promise<RecipeInput> => {
  const contentChanged = ingredientsOrInstructionsChanged(
    parentVersion,
    parsed,
  );
  const description = preserveTweakDescription(
    parentVersion.description,
    parsed.description,
    contentChanged,
  );
  const prepared = await prepareImportedRecipeInput({
    recipe: {...parsed, description, sourceUrl: recipe.sourceUrl ?? null},
    userId,
    queryFn,
    options: {sourceUrl: recipe.sourceUrl ?? undefined},
  });
  return {
    ...prepared,
    imageUrl: parentVersion.imageUrl,
    tagIds: parentVersion.tags.map((tag: {id: string}) => tag.id),
  };
};

export const createTweakAiSession = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(TweakAiStartSchema, req, res);
  if (!body.ok) {
    return;
  }
  const recipeId = getParam(req, 'id');
  const loaded = await loadSessionContext(recipeId, req.userId, queryFn);
  if ('error' in loaded) {
    res.status(loaded.status).json({error: loaded.error});
    return;
  }
  const {parentVersion, context} = loaded;

  let plan: string;
  try {
    plan = await callClaudeText(
      PLAN_SYSTEM,
      `Recipe and cook logs:\n${context}\n\nUser request: ${body.data.prompt}`,
    );
  } catch {
    res.status(502).json({error: 'AI planning failed'});
    return;
  }

  const messages: TweakAiMessage[] = [
    {role: 'user', content: body.data.prompt},
    {role: 'assistant', content: plan},
  ];
  const insertResult = await queryFn(INSERT_SESSION_SQL, [
    recipeId,
    req.userId,
    JSON.stringify(messages),
    parentVersion.id,
  ]);
  const row = insertResult.rows[0] as SessionRow;
  res.status(201).json({session: mapSessionRow(row), plan});
};

export const sendTweakAiMessage = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(TweakAiMessageSchema, req, res);
  if (!body.ok) {
    return;
  }
  const recipeId = getParam(req, 'id');
  const sessionId = getParam(req, 'sessionId');
  const session = await fetchOwnedSession(
    sessionId,
    recipeId,
    req.userId,
    queryFn,
  );
  if (!session) {
    res.status(404).json({error: 'Session not found'});
    return;
  }
  if (session.phase !== 'planning') {
    res.status(409).json({error: 'Session is no longer in planning phase'});
    return;
  }

  const loaded = await loadSessionContext(recipeId, req.userId, queryFn);
  if ('error' in loaded) {
    res.status(loaded.status).json({error: loaded.error});
    return;
  }
  const {context} = loaded;

  const priorMessages = session.messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');
  let reply: string;
  try {
    reply = await callClaudeText(
      PLAN_SYSTEM,
      `Recipe and cook logs:\n${context}\n\nConversation so far:\n${priorMessages}\n\nUser: ${body.data.content}`,
    );
  } catch {
    res.status(502).json({error: 'AI planning failed'});
    return;
  }

  const messages: TweakAiMessage[] = [
    ...session.messages,
    {role: 'user', content: body.data.content},
    {role: 'assistant', content: reply},
  ];
  const row = await queryFn(GET_SESSION_SQL, [sessionId, recipeId, req.userId]);
  const updated = await persistSession(
    row.rows[0] as SessionRow,
    {messages},
    queryFn,
  );
  res.json({session: updated, reply});
};

type ImplementCoreParams = {
  sessionRow: SessionRow;
  approvedPlan: string;
  recipeId: string;
  userId: string;
  queryFn: QueryFn;
};

const implementTweakAiSessionCore = async ({
  sessionRow,
  approvedPlan,
  recipeId,
  userId,
  queryFn,
}: ImplementCoreParams): Promise<
  | {error: string; status: number}
  | {session: TweakAiSession; changeSummary: string; preview: RecipeInput}
> => {
  const loaded = await loadSessionContext(recipeId, userId, queryFn);
  if ('error' in loaded) {
    return loaded;
  }
  const {recipe, parentVersion, context} = loaded;

  let parsed;
  try {
    const text = await callClaudeText(
      IMPLEMENT_SYSTEM,
      `Recipe and cook logs:\n${context}\n\nApproved plan:\n${approvedPlan}`,
    );
    parsed = parseAiJson(RecipeImportSchema, text);
  } catch (error) {
    if (error instanceof RecipeImportError) {
      return {error: error.message, status: 422};
    }
    return {error: 'AI implementation failed', status: 502};
  }

  let input: RecipeInput;
  try {
    input = await recipeInputFromParsed({
      parsed,
      parentVersion,
      recipe: {
        title: recipe.title,
        description: recipe.description,
        servings: recipe.servings,
        prepTimeMin: recipe.prepTimeMin,
        cookTimeMin: recipe.cookTimeMin,
        imageUrl: recipe.imageUrl,
        sourceUrl: recipe.sourceUrl,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        tagIds: recipe.tags.map(t => t.id),
      },
      userId,
      queryFn,
    });
  } catch (error) {
    if (error instanceof RecipeImportError) {
      return {error: error.message, status: 422};
    }
    throw error;
  }

  const changeSummary = `AI tweak: ${approvedPlan.slice(0, 200)}`;
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

export const approveTweakAiPlan = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const sessionId = getParam(req, 'sessionId');
  const session = await fetchOwnedSession(
    sessionId,
    recipeId,
    req.userId,
    queryFn,
  );
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
    .find(m => m.role === 'assistant');
  if (!lastAssistant) {
    res.status(422).json({error: 'No plan to approve'});
    return;
  }

  const row = await queryFn(GET_SESSION_SQL, [sessionId, recipeId, req.userId]);
  const result = await implementTweakAiSessionCore({
    sessionRow: row.rows[0] as SessionRow,
    approvedPlan: lastAssistant.content,
    recipeId,
    userId: req.userId,
    queryFn,
  });
  if ('error' in result) {
    res.status(result.status).json({error: result.error});
    return;
  }
  res.json(result);
};

export const implementTweakAiSession = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const sessionId = getParam(req, 'sessionId');
  const session = await fetchOwnedSession(
    sessionId,
    recipeId,
    req.userId,
    queryFn,
  );
  if (!session) {
    res.status(404).json({error: 'Session not found'});
    return;
  }
  if (session.phase !== 'plan_approved') {
    res.status(409).json({error: 'Approve the plan before implementing'});
    return;
  }
  if (!session.approvedPlan) {
    res.status(422).json({error: 'No approved plan'});
    return;
  }

  const row = await queryFn(GET_SESSION_SQL, [sessionId, recipeId, req.userId]);
  const result = await implementTweakAiSessionCore({
    sessionRow: row.rows[0] as SessionRow,
    approvedPlan: session.approvedPlan,
    recipeId,
    userId: req.userId,
    queryFn,
  });
  if ('error' in result) {
    res.status(result.status).json({error: result.error});
    return;
  }
  res.json(result);
};

export const createVersionFromTweakAiSession = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const sessionId = getParam(req, 'sessionId');
  const session = await fetchOwnedSession(
    sessionId,
    recipeId,
    req.userId,
    queryFn,
  );
  if (!session) {
    res.status(404).json({error: 'Session not found'});
    return;
  }
  if (session.phase !== 'preview_ready' || !session.proposedRecipe) {
    res.status(409).json({error: 'No preview ready to save'});
    return;
  }

  const recipe = await fetchRecipeDetail(recipeId, req.userId, queryFn);
  if (!recipe) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }

  const input = session.proposedRecipe as unknown as RecipeInput;
  const summary = session.approvedPlan?.slice(0, 200) ?? 'AI tweak';

  const newVersionId = await runTransactional(queryFn, async q => {
    const versionNumber = await getNextVersionNumber(recipeId, q);
    const version = await insertVersion(
      buildVersionOptions({
        input,
        recipeId,
        versionNumber,
        createdVia: 'tweak_ai',
        extras: {
          changeSummary: summary,
          derivedFromVersionId: session.parentVersionId,
        },
      }),
      q,
    );
    const id = version.rows[0]?.id;
    if (!id) {
      throw new Error('Failed to create version');
    }
    await insertIngredients(id, input.ingredients, q);
    await insertInstructions(id, input.instructions, q);
    await linkTags(id, input.tagIds, q);
    if (recipe.status === 'idea') {
      await setLineageStatus(recipeId, req.userId, 'evolving', q);
    }
    return id;
  });

  const version = await fetchVersionDetail(
    newVersionId,
    recipeId,
    req.userId,
    queryFn,
  );
  if (!version) {
    res.status(500).json({error: 'Failed to fetch created version'});
    return;
  }

  const row = await queryFn(GET_SESSION_SQL, [sessionId, recipeId, req.userId]);
  const updatedSession = await persistSession(
    row.rows[0] as SessionRow,
    {phase: 'completed'},
    queryFn,
  );
  res
    .status(201)
    .json({session: updatedSession, versionId: newVersionId, version});
};

export const cancelTweakAiSession = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const sessionId = getParam(req, 'sessionId');
  const session = await fetchOwnedSession(
    sessionId,
    recipeId,
    req.userId,
    queryFn,
  );
  if (!session) {
    res.status(404).json({error: 'Session not found'});
    return;
  }
  if (session.phase === 'completed' || session.phase === 'cancelled') {
    res.status(409).json({error: 'Session already finished'});
    return;
  }
  const row = await queryFn(GET_SESSION_SQL, [sessionId, recipeId, req.userId]);
  const updated = await persistSession(
    row.rows[0] as SessionRow,
    {phase: 'cancelled'},
    queryFn,
  );
  res.json({session: updated});
};

export const getTweakAiSession = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const recipeId = getParam(req, 'id');
  const sessionId = getParam(req, 'sessionId');
  const session = await fetchOwnedSession(
    sessionId,
    recipeId,
    req.userId,
    queryFn,
  );
  if (!session) {
    res.status(404).json({error: 'Session not found'});
    return;
  }
  res.json({session});
};
