import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Pins the migration contract for #534: issued share-link tokens live in
// their own table so a new mint never replaces a link already sent, and
// existing column hashes are backfilled into the issued set.
const migrationSql = readFileSync(
  join(
    fileURLToPath(import.meta.url),
    '..',
    'migrations',
    '027_recipe_share_tokens.sql',
  ),
  'utf8',
).toLowerCase();

describe('migration 027: issued share tokens', () => {
  test('creates the issued-token table keyed by recipe + hash', () => {
    expect(migrationSql).toContain(
      'create table if not exists recipe_share_tokens',
    );
    expect(migrationSql).toContain('primary key (recipe_id, token_hash)');
    expect(migrationSql).toContain('references recipes(id) on delete cascade');
  });

  test('backfills existing column hashes into the issued set', () => {
    expect(migrationSql).toContain(
      'insert into recipe_share_tokens (recipe_id, token_hash)',
    );
    expect(migrationSql).toContain('where share_token_hash is not null');
    expect(migrationSql).toContain('on conflict do nothing');
  });
});
