import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Pins the migration contract for #363: every entry that carries
// servings gains a servings_to_eat twin, backfilled from the existing
// (cook) servings so existing meals/plans keep identical nutrition.
const migrationSql = readFileSync(
  join(
    fileURLToPath(import.meta.url),
    '..',
    'migrations',
    '023_cook_eat_servings.sql',
  ),
  'utf8',
).toLowerCase();

describe('migration 023: cook vs eat servings', () => {
  test('adds servings_to_eat to all three entry tables', () => {
    for (const table of [
      'meal_recipes',
      'meal_ingredients',
      'meal_plan_entries',
    ]) {
      expect(migrationSql).toContain(`alter table ${table}`);
    }
    expect(migrationSql).toContain('add column if not exists servings_to_eat');
  });

  test('backfills servings_to_eat from servings', () => {
    expect(migrationSql).toContain('set servings_to_eat = servings');
    expect(migrationSql).toContain('where servings_to_eat is null');
  });

  test('keeps the positive check pattern of the servings columns', () => {
    expect(migrationSql).toContain('check (servings_to_eat > 0)');
    expect(migrationSql).toContain(
      'check (servings_to_eat is null or servings_to_eat > 0)',
    );
  });

  test('does not rename or drop the existing servings columns', () => {
    expect(migrationSql).not.toContain('rename');
    expect(migrationSql).not.toContain('drop column');
  });
});
