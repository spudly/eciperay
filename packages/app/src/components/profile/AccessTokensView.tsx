import type {AccessTokensViewProps} from '@eciperay/client';
import {Text as DsText, tokens} from '@spudly/ui';
import {Text} from 'react-native';
import {XStack, YStack} from 'tamagui';

import {EmptyMessage} from '../ui/EmptyMessage';
import {ErrorText} from '../ui/ErrorText';
import {InfoBanner} from '../ui/InfoBanner';
import {PrimaryButton} from '../ui/PrimaryButton';
import {SecondaryButton} from '../ui/SecondaryButton';
import {SectionCard} from '../ui/SectionCard';
import {TextField} from '../ui/TextField';

import {TokenRow} from './AccessTokensTokenRow';

const secretTextStyle = {
  fontFamily: tokens.typography.fontFamily.mono,
  fontSize: tokens.typography.fontSize.sm,
  color: tokens.colors.gray.gray10,
} as const;

/* Created-secret panel: the amber warning treatment on DS warning-ramp
   tokens (the ramp is hex-identical to Tailwind amber: amber-50 =
   warning1, amber-300 = warning4, amber-800 = warning9, amber-900 =
   warning10). */
const CreatedSecretPanel = ({
  secret,
  onDismissSecret,
}: {
  secret: string;
  onDismissSecret: () => void;
}) => (
  <YStack
    marginBlockEnd="$4"
    borderRadius={tokens.radii.md}
    borderWidth={1}
    borderColor={tokens.colors.warning.warning4}
    backgroundColor={tokens.colors.warning.warning1}
    padding="$4"
  >
    <DsText
      marginBlockEnd="$2"
      fontSize={tokens.typography.fontSize.sm}
      fontWeight={tokens.typography.fontWeight.semibold}
      color={tokens.colors.warning.warning10}
    >
      Copy your new token now — you won&apos;t see it again.
    </DsText>
    <YStack
      marginBlockEnd="$1"
      borderRadius={tokens.radii.sm}
      backgroundColor="$surface"
      padding="$3"
    >
      {/* RN Text: the secret needs the `selectable` prop for copy, which
          the DS Text doesn't expose; values are DS tokens. */}
      <Text style={secretTextStyle}>{secret}</Text>
    </YStack>
    <DsText
      marginBlockEnd="$3"
      fontSize={tokens.typography.fontSize.xs}
      color={tokens.colors.warning.warning9}
    >
      Long-press the token to copy it.
    </DsText>
    <XStack gap="$2">
      <SecondaryButton
        label="Done"
        onPress={onDismissSecret}
      />
    </XStack>
  </YStack>
);

export const AccessTokensView = ({
  tokens: accessTokens,
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
    <YStack marginBlockEnd="$4">
      <TextField
        label="Token name"
        value={tokenName}
        onChange={onTokenNameChange}
        placeholder="e.g. Claude Desktop"
      />
      <YStack marginBlockStart="$3">
        <PrimaryButton
          label="Create token"
          loading={isCreating}
          disabled={!tokenName.trim() || createdSecret !== null}
          onPress={onCreate}
        />
      </YStack>
    </YStack>
    {error ? <ErrorText>{error}</ErrorText> : null}
    {isLoading ? (
      <DsText
        fontSize={tokens.typography.fontSize.sm}
        color={tokens.colors.gray.gray6}
      >
        Loading tokens…
      </DsText>
    ) : accessTokens.length === 0 ? (
      <EmptyMessage>No tokens yet.</EmptyMessage>
    ) : (
      <YStack>
        {accessTokens.map(token => (
          <TokenRow
            key={token.id}
            token={token}
            revoking={revokingId === token.id}
            onRevoke={onRevoke}
          />
        ))}
      </YStack>
    )}
  </SectionCard>
);
