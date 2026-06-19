import {makeRecipeDetail} from '../test/fixtures/recipe.js';
import {makeCookLogRow} from '../test/fixtures/cookLogRow.js';
import {mapRowToCookLog} from '../routes/cooks/mapRowToCookLog.js';
import {makeVersionDetailRow} from '../test/fixtures/versionRow.js';

import {mapRowToVersionDetail} from './mapRowToRecipeDetail.js';
import {buildRecipeContext, buildTweakContext} from './buildRecipeContext.js';

describe('buildRecipeContext', () => {
  test('serializes recipe detail without ids', () => {
    const context = buildRecipeContext(makeRecipeDetail());
    expect(context).toContain('"title": "Test Recipe"');
    expect(context).not.toContain('recipe-uuid-1');
  });
});

describe('buildTweakContext', () => {
  test('includes recipe and cook logs', () => {
    const version = mapRowToVersionDetail(makeVersionDetailRow());
    const cookLogs = [mapRowToCookLog(makeCookLogRow())];
    const context = buildTweakContext(version, cookLogs);
    expect(context).toContain('"cookLogs"');
    expect(context).toContain('Turned out great');
  });
});
