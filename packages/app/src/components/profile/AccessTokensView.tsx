import type {AccessTokensViewProps} from '@eciperay/client';
import type {PersonalAccessToken} from '@eciperay/types';
import {Text, View} from 'react-native';

import {DestructiveButton} from '../ui/DestructiveButton';
import {EmptyMessage} from '../ui/EmptyMessage';
import {ErrorText} from '../ui/ErrorText';
import {InfoBanner} from '../ui/InfoBanner';
import {PrimaryButton} from '../ui/PrimaryButton';
import {SecondaryButton} from '../ui/SecondaryButton';
import {SectionCard} from '../ui/SectionCard';
import {TextField} from '../ui/TextField';

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

const CreatedSecretPanel = ({
  secret,
  onDismissSecret,
}: {
  secret: string;
  onDismissSecret: () => void;
}) => (
  <View className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
    <Text className="mb-2 text-sm font-semibold text-amber-900">
      Copy your new token now — you won&apos;t see it again.
    </Text>
    <Text
      selectable
      className="mb-1 rounded bg-white p-3 font-mono text-sm text-slate-900"
    >
      {secret}
    </Text>
    <Text className="mb-3 text-xs text-amber-800">
      Long-press the token to copy it.
    </Text>
    <View className="flex-row gap-2">
      <SecondaryButton
        label="Done"
        onPress={onDismissSecret}
      />
    </View>
  </View>
);

const TokenRow = ({
  token,
  revoking,
  onRevoke,
}: {
  token: PersonalAccessToken;
  revoking: boolean;
  onRevoke: (id: string) => void;
}) => (
  <View
    className="
    flex-row items-center justify-between gap-3 border-b border-slate-100 py-3
  "
  >
    <View className="min-w-0 flex-1">
      <Text className="text-sm font-medium text-slate-900">
        {token.name}
        {token.revokedAt ? (
          <Text className="text-xs font-normal text-slate-500"> (Revoked)</Text>
        ) : null}
      </Text>
      <Text className="mt-0.5 font-mono text-xs text-slate-500">
        {token.tokenPrefix}…
      </Text>
      <Text className="mt-0.5 text-xs text-slate-500">
        {describeToken(token)}
      </Text>
    </View>
    {token.revokedAt ? null : (
      <DestructiveButton
        label={revoking ? 'Revoking…' : 'Revoke'}
        disabled={revoking}
        onPress={() => {
          onRevoke(token.id);
        }}
      />
    )}
  </View>
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
    <View className="mb-4">
      <TextField
        label="Token name"
        value={tokenName}
        onChange={onTokenNameChange}
        placeholder="e.g. Claude Desktop"
      />
      <View className="mt-3">
        <PrimaryButton
          label="Create token"
          loading={isCreating}
          onPress={onCreate}
        />
      </View>
    </View>
    {error ? <ErrorText>{error}</ErrorText> : null}
    {isLoading ? (
      <Text className="text-sm text-slate-500">Loading tokens…</Text>
    ) : tokens.length === 0 ? (
      <EmptyMessage>No tokens yet.</EmptyMessage>
    ) : (
      <View>
        {tokens.map(token => (
          <TokenRow
            key={token.id}
            token={token}
            revoking={revokingId === token.id}
            onRevoke={onRevoke}
          />
        ))}
      </View>
    )}
  </SectionCard>
);
