import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Pins the migration contract for #539/#596: meal plan entries gain an
// optional `day` (a plain date) that loadMealPlanDetail selects
// unconditionally — if this migration is not applied to a database, every
// listPlans call against it throws `column "day" does not exist` (#596).
// The column must stay nullable with no backfill: entries written before
// the migration keep `day = null` and group under the plan-order fallback.
const migrationSql = readFileSync(
  join(
    fileURLToPath(import.meta.url),
    '..',
    'migrations',
    '028_meal_plan_entry_day.sql',
  ),
  'utf8',
).toLowerCase();

describe('migration 028: meal plan entry day', () => {
  test('adds day as a date column on meal_plan_entries', () => {
    expect(migrationSql).toContain('alter table meal_plan_entries');
    expect(migrationSql).toContain('add column');
    expect(migrationSql).toContain('day date');
  });

  test('is idempotent, so a re-run against a migrated database is safe', () => {
    expect(migrationSql).toContain('add column if not exists day date');
  });

  test('keeps day nullable with no backfill', () => {
    expect(migrationSql).not.toContain('not null');
    expect(migrationSql).not.toContain('update meal_plan_entries');
    expect(migrationSql).not.toContain('set day');
  });

  test('does not rename or drop existing columns', () => {
    expect(migrationSql).not.toContain('rename');
    expect(migrationSql).not.toContain('drop column');
  });
});
