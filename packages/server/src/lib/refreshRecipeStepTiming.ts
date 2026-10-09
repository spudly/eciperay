import {query as defaultQuery} from '../db/query.js';

import {anthropic, HAIKU} from './anthropic.js';
import {serverLog} from './posthogLogs.js';
import {AiStepTimingResponseSchema} from './mealSchemas.js';
import {parseAiJson} from './schemas.js';

type QueryFn = typeof defaultQuery;

type InstructionRow = {id: string; step_number: number; body: string};

type VersionMeta = {
  version_id: string;
  title: string;
  prep_time_min: number | null;
  cook_time_min: number | null;
  step_timing_status: string | null;
};

const FETCH_VERSION_SQL = `
  select rv.id as version_id, rv.title, rv.prep_time_min, rv.cook_time_min,
         rv.step_timing_status
  from recipe_versions rv
  where rv.id = $1
`;

const FETCH_INSTRUCTIONS_SQL = `
  select id, step_number, body
  from instructions
  where recipe_version_id = $1
  order by step_number asc
`;

export const estimateStepTimingFromAi = async (
  title: string,
  steps: InstructionRow[],
  prepTimeMin: number | null,
  cookTimeMin: number | null,
) => {
  const stepList = steps
    .map(step => `${step.step_number}. ${step.body}`)
    .join('\n');
  const hints = [
    prepTimeMin === null ? null : `prepTimeMin=${prepTimeMin}`,
    cookTimeMin === null ? null : `cookTimeMin=${cookTimeMin}`,
  ]
    .filter(Boolean)
    .join(', ');

  const prompt = `Estimate how many minutes each cooking instruction takes for recipe "${title}".
${hints ? `Recipe time hints: ${hints}.` : ''}
Instructions:
${stepList}
Return ONLY JSON array: [{"stepNumber":n,"durationMin":n}, ...] with one entry per step. durationMin is a non-negative integer.`;

  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 1024,
    messages: [{role: 'user', content: prompt}],
  });
  const content = response.content[0];
  /* c8 ignore next 3 -- Claude returns non-text blocks only on API errors */
  if (content?.type !== 'text') {
    throw new Error('Unexpected Claude response');
  }
  return parseAiJson(AiStepTimingResponseSchema, content.text);
};

export const refreshRecipeStepTiming = async (
  versionId: string,
  queryFn: QueryFn = defaultQuery,
): Promise<boolean> => {
  const versionResult = await queryFn(FETCH_VERSION_SQL, [versionId]);
  const version = versionResult.rows[0] as VersionMeta | undefined;
  if (!version) {
    return false;
  }

  await queryFn(
    `update recipe_versions
     set step_timing_status = 'pending', step_timing_updated_at = now()
     where id = $1`,
    [versionId],
  );

  try {
    const instructionsResult = await queryFn(FETCH_INSTRUCTIONS_SQL, [
      versionId,
    ]);
    const instructions = instructionsResult.rows as InstructionRow[];
    if (instructions.length === 0) {
      await queryFn(
        `update recipe_versions
         set step_timing_status = 'ready', step_timing_updated_at = now()
         where id = $1`,
        [versionId],
      );
      return true;
    }

    const estimated = await estimateStepTimingFromAi(
      version.title,
      instructions,
      version.prep_time_min,
      version.cook_time_min,
    );
    const byStep = new Map(
      estimated.map(item => [item.stepNumber, item.durationMin]),
    );

    for (const instruction of instructions) {
      const duration = byStep.get(instruction.step_number) ?? 5;
      await queryFn(
        `update instructions
         set estimated_duration_min = $2
         where id = $1`,
        [instruction.id, duration],
      );
    }

    await queryFn(
      `update recipe_versions
       set step_timing_status = 'ready', step_timing_updated_at = now()
       where id = $1`,
      [versionId],
    );
    return true;
  } catch (error) {
    await queryFn(
      `update recipe_versions
       set step_timing_status = 'failed', step_timing_updated_at = now()
       where id = $1`,
      [versionId],
    );
    serverLog('error', 'step timing refresh failed', {
      versionId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    throw error;
  }
};

export const ensureRecipeStepTiming = async (
  versionId: string,
  stepTimingStatus: string | null,
  queryFn: QueryFn = defaultQuery,
  refresh = false,
): Promise<void> => {
  if (!refresh && stepTimingStatus === 'ready') {
    return;
  }
  await refreshRecipeStepTiming(versionId, queryFn);
};
