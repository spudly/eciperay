import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Pins the migration contract for #362 tranche 1: direct ingredients live
// in their own table on the meal (not as hidden recipes), carry
// entry-level servings, and store nutrition in the recipe shape.
const migrationSql = readFileSync(
  join(
    fileURLToPath(import.meta.url),
    '..',
    'migrations',
    '021_meal_ingredients.sql',
  ),
  'utf8',
).toLowerCase();

describe('migration 021: meal_ingredients', () => {
  test('creates meal_ingredients cascading from meals', () => {
    expect(migrationSql).toContain(
      'create table if not exists meal_ingredients',
    );
    expect(migrationSql).toContain('references meals(id) on delete cascade');
  });

  test('stores the entry fields including entry-level servings and sort order', () => {
    for (const column of [
      'name',
      'quantity',
      'unit',
      'servings',
      'sort_order',
    ]) {
      expect(migrationSql).toContain(column);
    }
    expect(migrationSql).toContain('check (servings > 0)');
  });

  test('mirrors the recipe nutrition columns', () => {
    for (const column of [
      'calories',
      'protein_g',
      'carbs_g',
      'fat_g',
      'fiber_g',
      'sugar_g',
      'sodium_mg',
      'prepared_weight_g',
      'satiety_score',
      'nutrition_status',
      'nutrition_disclaimer',
      'nutrition_updated_at',
    ]) {
      expect(migrationSql).toContain(column);
    }
    expect(migrationSql).toContain("'pending', 'ready', 'failed'");
  });

  test('does not create or reference hidden recipes', () => {
    expect(migrationSql).not.toContain('insert into recipes');
    expect(migrationSql).not.toContain('references recipes');
  });
});
