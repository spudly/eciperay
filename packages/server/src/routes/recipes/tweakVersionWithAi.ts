import type {Response} from 'express';
import type {RecipeInput} from '@eciperay/types';

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
import {prepareImportedRecipeInput} from '../../lib/prepareImportedRecipeInput.js';
import {fetchRecipeDetail} from '../../lib/recipeQueries.js';
import {RecipeImportError} from '../../lib/recipeImportToInput.js';
import {
  RecipeImportSchema,
  TweakAiSchema,
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

const LIST_COOK_LOGS_SQL = `
  select cl.*
  from cook_logs cl
  where cl.recipe_version_id = $1
  order by cl.cooked_at desc
`;

const TWEAK_SYSTEM = `You are a culinary assistant. Given a recipe with cook log feedback and a user request, produce a complete updated recipe as JSON only (no markdown):
{
  "title": string,
  "description": string | null,
  "servings": number,
  "prepTimeMin": number | null,
  "cookTimeMin": number | null,
  "ingredients": [{"sortOrder": number, "name": string, "quantity": number|null, "unit": string|null, "notes": string|null, "isOptional": false}],
  "instructions": [{"stepNumber": number, "body": string}]
}
Respect the user's request while preserving what works. Number ingredients with sortOrder starting at 0 and steps starting at 1.`;

const callClaudeForTweak = async (context: string, prompt: string) => {
  const response = await anthropic.messages.create({
    model: SONNET,
    max_tokens: 4096,
    system: TWEAK_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Recipe and cook logs:\n${context}\n\nUser request: ${prompt}`,
      },
    ],
  });
  const content = response.content[0];
  /* c8 ignore next 3 -- Claude returns non-text blocks only on API errors */
  if (content?.type !== 'text') {
    throw new Error('Unexpected Claude response');
  }
  return parseAiJson(RecipeImportSchema, content.text);
};

const recipeInputFromTweak = async (
  parsed: Awaited<ReturnType<typeof callClaudeForTweak>>,
  recipe: RecipeInput,
  userId: string,
  queryFn: QueryFn,
): Promise<RecipeInput> => {
  const prepared = await prepareImportedRecipeInput({
    recipe: {...parsed, sourceUrl: recipe.sourceUrl ?? null},
    userId,
    queryFn,
    options: {sourceUrl: recipe.sourceUrl ?? undefined},
  });
  return {...prepared, imageUrl: recipe.imageUrl, tagIds: recipe.tagIds};
};

export const tweakVersionWithAi = async (
  req: AuthedRequest,
  res: Response,
  queryFn: QueryFn,
) => {
  const body = validate(TweakAiSchema, req, res);
  if (!body.ok) {
    return;
  }
  const recipeId = getParam(req, 'id');
  const recipe = await fetchRecipeDetail(recipeId, req.userId, queryFn);
  if (!recipe) {
    res.status(404).json({error: 'Recipe not found'});
    return;
  }
  if (!isRecipeEditable(recipe.lifecycleStatus)) {
    res.status(409).json({error: recipeEditBlockedError()});
    return;
  }

  const activeVersion = await fetchVersionDetail(
    recipe.versionId,
    recipeId,
    req.userId,
    queryFn,
  );
  if (!activeVersion) {
    res.status(404).json({error: 'Active version not found'});
    return;
  }

  const cookLogResult = await queryFn(LIST_COOK_LOGS_SQL, [recipe.versionId]);
  const cookLogs = cookLogResult.rows.map(row =>
    mapRowToCookLog(row as Parameters<typeof mapRowToCookLog>[0]),
  );

  let input;
  try {
    const parsed = await callClaudeForTweak(
      buildTweakContext(activeVersion, cookLogs),
      body.data.prompt,
    );
    input = await recipeInputFromTweak(
      parsed,
      {
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
      req.userId,
      queryFn,
    );
  } catch (error) {
    if (error instanceof RecipeImportError) {
      res.status(422).json({error: error.message});
      return;
    }
    throw error;
  }

  const changeSummary = `AI tweak: ${body.data.prompt.slice(0, 200)}`;
  const newVersionId = await runTransactional(queryFn, async q => {
    const versionNumber = await getNextVersionNumber(recipeId, q);
    const version = await insertVersion(
      buildVersionOptions({
        input,
        recipeId,
        versionNumber,
        createdVia: 'tweak_ai',
        extras: {changeSummary, derivedFromVersionId: recipe.versionId},
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
    if (recipe.lifecycleStatus === 'idea') {
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
  res.status(201).json({versionId: newVersionId, changeSummary, version});
};
