import { PersonalAccessToken } from '@eciperay/types';
import { View, Text } from 'react-native';

import { DestructiveButton } from '../ui/DestructiveButton';

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
  <View
    className="
      flex-row items-center justify-between gap-3 border-be border-slate-100
      py-3
    "
  >
    <View className="flex-1 min-inline-0">
      <Text className="text-sm font-medium text-slate-900">
        {token.name}
        {token.revokedAt ? (
          <Text className="text-xs font-normal text-slate-500"> (Revoked)</Text>
        ) : null}
      </Text>
      <Text className="mbs-0.5 font-mono text-xs text-slate-500">
        {token.tokenPrefix}…
      </Text>
      <Text className="mbs-0.5 text-xs text-slate-500">
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
