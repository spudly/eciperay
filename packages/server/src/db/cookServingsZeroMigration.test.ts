import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Pins the migration contract for #540: servings-to-cook may be 0 (a
// leftover entry cooks nothing) on all three entry tables, while
// servings-to-eat keeps its positive check.
const migrationSql = readFileSync(
  join(
    fileURLToPath(import.meta.url),
    '..',
    'migrations',
    '026_cook_servings_zero.sql',
  ),
  'utf8',
).toLowerCase();

describe('migration 026: servings-to-cook may be 0', () => {
  test('relaxes the cook check on all three entry tables', () => {
    for (const table of [
      'meal_recipes',
      'meal_ingredients',
      'meal_plan_entries',
    ]) {
      expect(migrationSql).toContain(`alter table ${table}`);
    }
    expect(migrationSql).toContain('check (servings >= 0)');
    expect(migrationSql).toContain('check (servings is null or servings >= 0)');
  });

  test('does not relax servings-to-eat', () => {
    expect(migrationSql).not.toContain('servings_to_eat >=');
    expect(migrationSql).not.toContain('servings_to_eat_check');
  });
});
