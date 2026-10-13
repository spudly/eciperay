import type {AccessTokensViewProps} from '@eciperay/client';
import {Text, View} from 'react-native';

import {EmptyMessage} from '../ui/EmptyMessage';
import {ErrorText} from '../ui/ErrorText';
import {InfoBanner} from '../ui/InfoBanner';
import {PrimaryButton} from '../ui/PrimaryButton';
import {SecondaryButton} from '../ui/SecondaryButton';
import {SectionCard} from '../ui/SectionCard';
import {TextField} from '../ui/TextField';

import {TokenRow} from './AccessTokensTokenRow';

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
          disabled={!tokenName.trim() || createdSecret !== null}
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
