import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Regression coverage for #394 (a): deleting a recipe removes its
// meal_recipes rows, which must advance the parent meal's updated_at
// (its ETag token). The bump lives in a database trigger so it covers
// every deletion path — direct recipe deletion and the account-deletion
// cascade alike — so this suite pins the migration's trigger contract.
const migrationSql = readFileSync(
  join(
    fileURLToPath(import.meta.url),
    '..',
    'migrations',
    '020_meal_recipes_touch_meal.sql',
  ),
  'utf8',
).toLowerCase();

describe('migration 020: meal_recipes touch-meal trigger', () => {
  test('creates an AFTER DELETE row trigger on meal_recipes', () => {
    expect(migrationSql).toContain('create trigger');
    expect(migrationSql).toContain('after delete on meal_recipes');
    expect(migrationSql).toContain('for each row');
  });

  test("advances the parent meal's updated_at using the deleted row's meal_id", () => {
    expect(migrationSql).toContain('update meals');
    expect(migrationSql).toContain('set updated_at');
    expect(migrationSql).toContain('where id = old.meal_id');
  });

  test('bumps monotonically at millisecond precision so the ETag always moves', () => {
    expect(migrationSql).toContain('greatest(');
    expect(migrationSql).toContain(
      "date_trunc('milliseconds', updated_at) + interval '1 millisecond'",
    );
  });

  test('never inserts into meals, so a meal deleted in the same cascade is not resurrected', () => {
    expect(migrationSql).not.toContain('insert into meals');
  });
});
