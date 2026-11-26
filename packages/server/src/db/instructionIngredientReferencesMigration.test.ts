import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Pins the migration contract for #643 tranche 1: instructions gain the
// ingredient_references column cook mode's per-step ingredient display
// reads, defaulting to an empty array so legacy recipes keep rendering
// with the full ingredient list.
const migrationSql = readFileSync(
  join(
    fileURLToPath(import.meta.url),
    '..',
    'migrations',
    '033_instruction_ingredient_references.sql',
  ),
  'utf8',
).toLowerCase();

describe('migration 033: instruction ingredient references', () => {
  test('adds ingredient_references to instructions', () => {
    expect(migrationSql).toContain('alter table instructions');
    expect(migrationSql).toContain('add column if not exists ingredient_references');
  });

  test('stores references as a non-null jsonb array defaulting to empty', () => {
    expect(migrationSql).toContain('jsonb not null');
    expect(migrationSql).toContain("default '[]'::jsonb");
  });
});
