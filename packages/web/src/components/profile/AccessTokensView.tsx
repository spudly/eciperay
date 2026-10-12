import type {AccessTokensViewProps} from '@eciperay/client';
import type {PersonalAccessToken} from '@eciperay/types';
import {useState} from 'react';

import {DestructiveButton} from '../ui/DestructiveButton.js';
import {EmptyMessage} from '../ui/EmptyMessage.js';
import {ErrorText} from '../ui/ErrorText.js';
import {InfoBanner} from '../ui/InfoBanner.js';
import {PrimaryButton} from '../ui/PrimaryButton.js';
import {SecondaryButton} from '../ui/SecondaryButton.js';
import {SectionCard} from '../ui/SectionCard.js';
import {TextField} from '../ui/TextField.js';

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

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const CreatedSecretPanel = ({
  secret,
  onDismissSecret,
}: {
  secret: string;
  onDismissSecret: () => void;
}) => {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="mb-2 text-sm font-semibold text-amber-900">
        Copy your new token now — you won&apos;t see it again.
      </p>
      <code className="mb-3 block break-all rounded bg-white p-3 font-mono text-sm text-slate-900">
        {secret}
      </code>
      <div className="flex gap-2">
        <SecondaryButton
          label={copied ? 'Copied!' : 'Copy token'}
          onPress={() => {
            void copyToClipboard(secret).then(setCopied);
          }}
        />
        <SecondaryButton
          label="Done"
          onPress={onDismissSecret}
        />
      </div>
    </div>
  );
};

const TokenRow = ({
  token,
  revoking,
  onRevoke,
}: {
  token: PersonalAccessToken;
  revoking: boolean;
  onRevoke: (id: string) => void;
}) => (
  <li className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-b-0">
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-slate-900">
        {token.name}
        {token.revokedAt ? (
          <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-normal text-slate-600">
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

export const AccessTokensView = ({
  tokens,
  isLoading,
  tokenName,
  onTokenNameChange,
  onCreate,
  isCreating,
  createdSecret,
  onDismissSecret,
  revokingId,
  onRevoke,
  error,
}: AccessTokensViewProps) => (
  <SectionCard title="API access tokens">
    <InfoBanner>
      Personal access tokens let apps and scripts use the Eciperay API —
      including the MCP server — without signing in each time. Treat them like
      passwords.
    </InfoBanner>
    {createdSecret ? (
      <CreatedSecretPanel
        secret={createdSecret}
        onDismissSecret={onDismissSecret}
      />
    ) : null}
    <div className="mb-4 flex items-end gap-2">
      <div className="flex-1">
        <TextField
          label="Token name"
          value={tokenName}
          onChange={onTokenNameChange}
          placeholder="e.g. Claude Desktop"
        />
      </div>
      <PrimaryButton
        label="Create token"
        loading={isCreating}
        disabled={!tokenName.trim()}
        onPress={onCreate}
      />
    </div>
    {error ? <ErrorText>{error}</ErrorText> : null}
    {isLoading ? (
      <p className="text-sm text-slate-500">Loading tokens…</p>
    ) : tokens.length === 0 ? (
      <EmptyMessage>No tokens yet.</EmptyMessage>
    ) : (
      <ul>
        {tokens.map(token => (
          <TokenRow
            key={token.id}
            token={token}
            revoking={revokingId === token.id}
            onRevoke={onRevoke}
          />
        ))}
      </ul>
    )}
  </SectionCard>
);
