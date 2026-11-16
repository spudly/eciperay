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

// Statements are asserted per table: a table-name match in one
// statement must not satisfy another table's type or CHECK change.
const statements = migrationSql
  .split(';')
  .map(statement => statement.trim())
  .filter(statement => statement.length > 0);

const statementsFor = (table: string): string[] =>
  statements.filter(statement => statement.includes(`alter table ${table}`));

const entryTables = [
  {table: 'meal_recipes', eatCheck: 'check (servings_to_eat >= 0)'},
  {table: 'meal_ingredients', eatCheck: 'check (servings_to_eat >= 0)'},
  {
    table: 'meal_plan_entries',
    eatCheck: 'check (servings_to_eat is null or servings_to_eat >= 0)',
  },
] as const;

describe('migration 025: servings-to-eat may be 0 or fractional', () => {
  test('re-types servings_to_eat to numeric on all three entry tables', () => {
    for (const {table} of entryTables) {
      expect(
        statementsFor(table).some(statement =>
          statement.includes('alter column servings_to_eat type numeric'),
        ),
      ).toBe(true);
    }
  });

  test('relaxes the eat check to >= 0 on all three entry tables', () => {
    for (const {table, eatCheck} of entryTables) {
      expect(
        statementsFor(table).some(
          statement =>
            statement.includes(
              `add constraint ${table}_servings_to_eat_check`,
            ) && statement.includes(eatCheck),
        ),
      ).toBe(true);
    }
  });

  test('does not re-type or relax the cook columns', () => {
    expect(migrationSql).not.toContain('alter column servings type');
    expect(migrationSql).not.toContain('check (servings >=');
    expect(migrationSql).not.toContain(
      'check (servings is null or servings >=',
    );
  });
});
