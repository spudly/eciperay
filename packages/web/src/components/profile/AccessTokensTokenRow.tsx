import type {PersonalAccessToken} from '@eciperay/types';

import {DestructiveButton} from '../ui/DestructiveButton.js';

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const describeToken = (token: PersonalAccessToken): string => {
  const parts = [`Created ${formatDate(token.createdAt)}`];
  parts.push(
    token.lastUsedAt
      ? `Last used ${formatDate(token.lastUsedAt)}`
      : 'Never used',
  );
  return parts.join(' · ');
};

export const TokenRow = ({
  token,
  revoking,
  onRevoke,
}: {
  token: PersonalAccessToken;
  revoking: boolean;
  onRevoke: (id: string) => void;
}) => (
  <li
    className="
    flex items-center justify-between gap-3 border-b border-slate-100 py-3
    last:border-b-0
  "
  >
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-slate-900">
        {token.name}
        {token.revokedAt ? (
          <span
            className="
            ms-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-normal
            text-slate-600
          "
          >
            Revoked
          </span>
        ) : null}
      </p>
      <p className="mt-0.5 font-mono text-xs text-slate-500">
        {token.tokenPrefix}…
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{describeToken(token)}</p>
    </div>
    {token.revokedAt ? null : (
      <DestructiveButton
        label={revoking ? 'Revoking…' : 'Revoke'}
        disabled={revoking}
        onPress={() => {
          onRevoke(token.id);
        }}
      />
    )}
  </li>
);
