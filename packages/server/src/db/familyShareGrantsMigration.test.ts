import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Pins the migration contract for #617: family_share_grants is the standing
// owner -> recipient grant the read-access layer checks alongside
// recipe_share_grants. If the table shape drifts, family sharing silently
// stops conferring access.
const migrationSql = readFileSync(
  join(
    fileURLToPath(import.meta.url),
    '..',
    'migrations',
    '029_family_share_grants.sql',
  ),
  'utf8',
).toLowerCase();

describe('migration 029: family share grants', () => {
  test('creates family_share_grants with owner/recipient primary key', () => {
    expect(migrationSql).toContain('create table if not exists family_share_grants');
    expect(migrationSql).toContain('owner_user_id');
    expect(migrationSql).toContain('recipient_user_id');
    expect(migrationSql).toContain('primary key (owner_user_id, recipient_user_id)');
  });

  test('cascades on user deletion and forbids self-grants', () => {
    expect(migrationSql).toContain('on delete cascade');
    expect(migrationSql).toContain('owner_user_id <> recipient_user_id');
  });

  test('indexes recipient lookups', () => {
    expect(migrationSql).toContain('family_share_grants_recipient_idx');
    expect(migrationSql).toContain('recipient_user_id, created_at desc');
  });
});
