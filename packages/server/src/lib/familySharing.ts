import type {FamilyShareGrant} from '@eciperay/types';

import {query as defaultQuery} from '../db/query.js';

type QueryFn = typeof defaultQuery;

export const LIST_FAMILY_SHARE_GRANTS_SQL = `
  select fg.owner_user_id, fg.recipient_user_id, fg.created_at,
         u.email as recipient_email, u.display_name as recipient_display_name
  from family_share_grants fg
  join users u on u.id = fg.recipient_user_id
  where fg.owner_user_id = $1
  order by fg.created_at desc
`;

export const FIND_USER_BY_EMAIL_SQL = `
  select id, email, display_name
  from users
  where lower(email) = lower($1)
  limit 1
`;

export const INSERT_FAMILY_SHARE_GRANT_SQL = `
  insert into family_share_grants (owner_user_id, recipient_user_id)
  values ($1, $2)
  on conflict (owner_user_id, recipient_user_id) do update
    set created_at = family_share_grants.created_at
  returning owner_user_id, recipient_user_id, created_at
`;

export const DELETE_FAMILY_SHARE_GRANT_SQL = `
  delete from family_share_grants
  where owner_user_id = $1 and recipient_user_id = $2
`;

type GrantRow = {
  owner_user_id: string;
  recipient_user_id: string;
  recipient_email: string;
  recipient_display_name: string | null;
  created_at: string;
};

const mapGrantRow = (row: GrantRow): FamilyShareGrant => ({
  ownerUserId: row.owner_user_id,
  recipientUserId: row.recipient_user_id,
  recipientEmail: row.recipient_email,
  recipientDisplayName: row.recipient_display_name,
  createdAt: row.created_at,
});

export const listFamilyShareGrants = async (
  ownerUserId: string,
  queryFn: QueryFn,
): Promise<FamilyShareGrant[]> => {
  const result = await queryFn(LIST_FAMILY_SHARE_GRANTS_SQL, [ownerUserId]);
  return (result.rows as GrantRow[]).map(mapGrantRow);
};

export type CreateFamilyShareGrantResult =
  | {kind: 'ok'; grant: FamilyShareGrant}
  | {kind: 'unknown_email'}
  | {kind: 'self'};

/**
 * Designate a recipient by account email (#617). Only existing accounts can
 * be designated — an unknown email is a clear error, never a pending invite.
 */
export const createFamilyShareGrant = async (
  ownerUserId: string,
  email: string,
  queryFn: QueryFn,
): Promise<CreateFamilyShareGrantResult> => {
  const userResult = await queryFn(FIND_USER_BY_EMAIL_SQL, [email.trim()]);
  const recipient = userResult.rows[0] as
    | {id: string; email: string; display_name: string | null}
    | undefined;
  if (!recipient) {
    return {kind: 'unknown_email'};
  }
  if (recipient.id === ownerUserId) {
    return {kind: 'self'};
  }
  const inserted = await queryFn(INSERT_FAMILY_SHARE_GRANT_SQL, [
    ownerUserId,
    recipient.id,
  ]);
  const row = inserted.rows[0] as {
    owner_user_id: string;
    recipient_user_id: string;
    created_at: string;
  };
  return {
    kind: 'ok',
    grant: {
      ownerUserId: row.owner_user_id,
      recipientUserId: row.recipient_user_id,
      recipientEmail: recipient.email,
      recipientDisplayName: recipient.display_name,
      createdAt: row.created_at,
    },
  };
};

/** Revoke a designation. Returns false when no such designation existed. */
export const deleteFamilyShareGrant = async (
  ownerUserId: string,
  recipientUserId: string,
  queryFn: QueryFn,
): Promise<boolean> => {
  const result = await queryFn(DELETE_FAMILY_SHARE_GRANT_SQL, [
    ownerUserId,
    recipientUserId,
  ]);
  return (result.rowCount ?? 0) > 0;
};
