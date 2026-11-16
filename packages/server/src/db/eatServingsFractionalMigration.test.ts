import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Pins the migration contract for #541: servings-to-eat may be 0 or
// fractional on all three entry tables — the eat columns become
// numeric with a >= 0 check, while the cook columns are untouched.
const migrationSql = readFileSync(
  join(
    fileURLToPath(import.meta.url),
    '..',
    'migrations',
    '025_eat_servings_fractional.sql',
  ),
  'utf8',
).toLowerCase();

describe('migration 025: servings-to-eat may be 0 or fractional', () => {
  test('re-types servings_to_eat to numeric on all three entry tables', () => {
    for (const table of [
      'meal_recipes',
      'meal_ingredients',
      'meal_plan_entries',
    ]) {
      expect(migrationSql).toContain(`alter table ${table}`);
    }
    expect(migrationSql).toContain('alter column servings_to_eat type numeric');
  });

  test('relaxes the eat check to >= 0 on all three entry tables', () => {
    expect(migrationSql).toContain('check (servings_to_eat >= 0)');
    expect(migrationSql).toContain(
      'check (servings_to_eat is null or servings_to_eat >= 0)',
    );
  });

  test('does not re-type or relax the cook columns', () => {
    expect(migrationSql).not.toContain('alter column servings type');
    expect(migrationSql).not.toContain('check (servings >=');
    expect(migrationSql).not.toContain(
      'check (servings is null or servings >=',
    );
  });
});
