import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Pins the migration contract for #612: fuzzy recipe search needs the
// pg_trgm extension plus GIN trigram indexes on the two fields similarity
// matching applies to (recipe titles and ingredient names).
const migrationSql = readFileSync(
  join(
    fileURLToPath(import.meta.url),
    '..',
    'migrations',
    '031_search_trgm.sql',
  ),
  'utf8',
).toLowerCase();

describe('migration 031: search trigram support', () => {
  test('enables the pg_trgm extension', () => {
    expect(migrationSql).toContain('create extension if not exists pg_trgm');
  });

  test('adds a GIN trigram index on recipe version titles', () => {
    expect(migrationSql).toContain('on recipe_versions using gin');
    expect(migrationSql).toContain('title gin_trgm_ops');
  });

  test('adds a GIN trigram index on ingredient names', () => {
    expect(migrationSql).toContain('on ingredients using gin');
    expect(migrationSql).toContain('name gin_trgm_ops');
  });
});
