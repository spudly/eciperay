import {jest} from '@jest/globals';
import type {Response} from 'express';

import {RecipeImportError} from '../../lib/recipeImportToInput.js';
import {makeRecipeDetailRow} from '../../test/fixtures/recipeRow.js';
import {makeVersionDetailRow} from '../../test/fixtures/versionRow.js';
import {makeQueryResult} from '../../test/fixtures/queryResult.js';
import {createMockQuery} from '../../test/mockQuery.js';
import {nockAnthropicMessage} from '../../test/mockNockAnthropic.js';

jest.unstable_mockModule('../../lib/validate.js', () => ({
  validate: () => ({ok: true, data: {}}),
  parseAiJson: () => {
    throw new RecipeImportError('invalid recipe shape');
  },
  extractJsonFromAiText: (text: string) => text,
  AiResponseParseError: class AiResponseParseError extends Error {
    constructor(cause: unknown) {
      super('AI response validation failed');
      this.name = 'AiResponseParseError';
      this.cause = cause;
    }
  },
}));

const {implementTweakAiSession} = await import('./tweakAiSessions.js');

const mockQuery = createMockQuery();
const SESSION_ID = 'session-uuid-1';
const PLAN_TEXT = 'Add heavy cream and simplify the steps.';

const makeRes = () => {
  const res = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json: jest.fn(),
  };
  return res as unknown as Response & {statusCode: number; json: jest.Mock};
};

describe('implementTweakAiSession parse errors', () => {
  test('returns 422 when parseAiJson throws RecipeImportError', async () => {
    nockAnthropicMessage('{}');
    mockQuery
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            id: SESSION_ID,
            recipe_id: 'recipe-uuid-1',
            user_id: 'user-uuid-1',
            phase: 'plan_approved',
            messages: [],
            approved_plan: PLAN_TEXT,
            proposed_recipe: null,
            parent_version_id: 'version-uuid-1',
            change_summary: null,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ]),
      )
      .mockResolvedValueOnce(
        makeQueryResult([
          {
            id: SESSION_ID,
            recipe_id: 'recipe-uuid-1',
            user_id: 'user-uuid-1',
            phase: 'plan_approved',
            messages: [],
            approved_plan: PLAN_TEXT,
            proposed_recipe: null,
            parent_version_id: 'version-uuid-1',
            change_summary: null,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ]),
      )
      .mockResolvedValueOnce(makeQueryResult([makeRecipeDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([makeVersionDetailRow()]))
      .mockResolvedValueOnce(makeQueryResult([]));

    const res = makeRes();
    await implementTweakAiSession(
      {
        userId: 'user-uuid-1',
        params: {id: 'recipe-uuid-1', sessionId: SESSION_ID},
      } as never,
      res,
      mockQuery,
    );

    expect(res.statusCode).toBe(422);
    expect(res.json).toHaveBeenCalledWith({error: 'invalid recipe shape'});
  });
});
