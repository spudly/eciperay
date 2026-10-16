import type {PersonalAccessToken} from '@eciperay/types';
import {Text as DsText, tokens} from '@spudly/ui';
import {XStack, YStack} from 'tamagui';

import {DestructiveButton} from '../ui/DestructiveButton';

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

/* Row treatment on DS tokens: slate maps onto the gray ramp positionally
   (slate-100 border → gray2, slate-500 text → gray6, slate-900 text →
   gray10). The 2px top offsets are geometry from the old mbs-0.5,
   between DS spacing steps. */
export const TokenRow = ({
  token,
  revoking,
  onRevoke,
}: {
  token: PersonalAccessToken;
  revoking: boolean;
  onRevoke: (id: string) => void;
}) => (
  <XStack
    alignItems="center"
    justifyContent="space-between"
    gap="$3"
    borderBottomWidth={1}
    borderBottomColor={tokens.colors.gray.gray2}
    paddingVertical="$3"
  >
    <YStack
      flex={1}
      minWidth={0}
    >
      <DsText
        fontSize={tokens.typography.fontSize.sm}
        fontWeight={tokens.typography.fontWeight.medium}
        color={tokens.colors.gray.gray10}
      >
        {token.name}
        {token.revokedAt ? (
          <DsText
            fontSize={tokens.typography.fontSize.xs}
            fontWeight={tokens.typography.fontWeight.regular}
            color={tokens.colors.gray.gray6}
          >
            {' '}
            (Revoked)
          </DsText>
        ) : null}
      </DsText>
      <DsText
        marginBlockStart={2}
        fontFamily={tokens.typography.fontFamily.mono}
        fontSize={tokens.typography.fontSize.xs}
        color={tokens.colors.gray.gray6}
      >
        {token.tokenPrefix}…
      </DsText>
      <DsText
        marginBlockStart={2}
        fontSize={tokens.typography.fontSize.xs}
        color={tokens.colors.gray.gray6}
      >
        {describeToken(token)}
      </DsText>
    </YStack>
    {token.revokedAt ? null : (
      <DestructiveButton
        label={revoking ? 'Revoking…' : 'Revoke'}
        disabled={revoking}
        onPress={() => {
          onRevoke(token.id);
        }}
      />
    )}
  </XStack>
);
