import type {AccessTokensViewProps} from '@eciperay/client';
import {useState} from 'react';

import {EmptyMessage} from '../ui/EmptyMessage.js';
import {ErrorText} from '../ui/ErrorText.js';
import {InfoBanner} from '../ui/InfoBanner.js';
import {PrimaryButton} from '../ui/PrimaryButton.js';
import {SecondaryButton} from '../ui/SecondaryButton.js';
import {SectionCard} from '../ui/SectionCard.js';
import {TextField} from '../ui/TextField.js';

import {TokenRow} from './AccessTokensTokenRow.js';

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
      <code
        className="
          mb-3 block break-all rounded bg-white p-3 font-mono text-sm
          text-slate-900
        "
      >
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
        disabled={!tokenName.trim() || createdSecret !== null}
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
