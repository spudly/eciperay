import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Pins the migration contract for #635: recipe_versions gains a tips
// JSONB array column defaulting to empty, so existing rows read as
// "no tips" and no backfill is needed.
const migrationSql = readFileSync(
  join(
    fileURLToPath(import.meta.url),
    '..',
    'migrations',
    '033_recipe_version_tips.sql',
  ),
  'utf8',
).toLowerCase();

describe('migration 033: recipe version tips', () => {
  test('adds a tips column to recipe_versions', () => {
    expect(migrationSql).toContain('alter table recipe_versions');
    expect(migrationSql).toContain('add column if not exists tips');
  });

  test('tips is a non-null jsonb array defaulting to empty', () => {
    expect(migrationSql).toContain('jsonb');
    expect(migrationSql).toContain('not null');
    expect(migrationSql).toContain("default '[]'::jsonb");
  });

  test('does not rename or drop existing columns', () => {
    expect(migrationSql).not.toContain('rename');
    expect(migrationSql).not.toContain('drop column');
  });
});
