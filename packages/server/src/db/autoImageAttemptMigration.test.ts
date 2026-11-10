import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Pins the migration contract for #407: the once-per-recipe guard for
// automatic image generation lives on the recipe lineage, so it survives
// version edits and new versions alike.
const migrationSql = readFileSync(
  join(
    fileURLToPath(import.meta.url),
    '..',
    'migrations',
    '022_recipe_auto_image_attempt.sql',
  ),
  'utf8',
).toLowerCase();

describe('migration 022: recipe auto-image attempt marker', () => {
  test('adds a nullable attempted-at timestamp to recipes', () => {
    expect(migrationSql).toContain('alter table recipes');
    expect(migrationSql).toContain(
      'add column if not exists auto_image_attempted_at timestamptz',
    );
  });

  test('does not backfill or constrain existing recipes', () => {
    expect(migrationSql).not.toContain('not null');
    expect(migrationSql).not.toContain('update recipes');
  });
});
