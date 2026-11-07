import {tokens} from '@spudly/ui';
import {Text, XStack, YStack} from 'tamagui';

import {
  LabeledTextInput,
  SectionAlert,
  SectionButton,
  SectionCard,
} from './profileSection';

/**
 * Host-side mirror of the design-system AccessTokensPanel view: in @spudly/ui
 * 6.x that view is internal (not exported) and no exported page renders it, so
 * the section is re-expressed here with Tamagui primitives pending page
 * coverage in the design system. Props, copy, and behavior match the view's
 * contract — the container keeps the token and entitlement queries and the
 * create/revoke mutations; this section renders display state and reports
 * intents. Token rows are view-models whose dates the container pre-formats
 * into `metaLabel`, and the created secret crosses as a string the container
 * holds and dismisses.
 */

type AccessTokensPanelToken = {
  id: string;
  name: string;
  /** The token's non-secret prefix (rendered mono, with an ellipsis). */
  prefix: string;
  /** Pre-formatted meta line ("Created Jan 2, 2026 · Last used …"). */
  metaLabel: string;
  revoked?: boolean;
};

export type AccessTokensPanelProps = {
  tokens: AccessTokensPanelToken[];
  loading?: boolean;
  tokenName: string;
  onTokenNameChange: (value: string) => void;
  onCreate: () => void;
  isCreating?: boolean;
  createdSecret: string | null;
  onDismissSecret: () => void;
  revokingId?: string | null;
  onRevoke: (id: string) => void;
  error?: string | null;
  /**
   * When set, the create form is replaced by this explainer (the plan cannot
   * create tokens). The token list and revoke actions stay available.
   * Null/absent shows the form.
   */
  planNotice?: string | null;
};

type TokenRowProps = {
  token: AccessTokensPanelToken;
  revoking: boolean;
  onRevoke?: () => void;
};

const TokenRow = ({token, revoking, onRevoke}: TokenRowProps) => (
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
      <Text
        fontSize={tokens.typography.fontSize.sm}
        fontWeight={tokens.typography.fontWeight.medium}
        color={tokens.colors.gray.gray10}
      >
        {token.name}
        {token.revoked ? (
          <Text
            fontSize={tokens.typography.fontSize.xs}
            fontWeight={tokens.typography.fontWeight.regular}
            color={tokens.colors.gray.gray6}
          >
            {' (Revoked)'}
          </Text>
        ) : null}
      </Text>
      <YStack paddingBlockStart={2}>
        <Text
          fontFamily={tokens.typography.fontFamily.mono}
          fontSize={tokens.typography.fontSize.xs}
          color={tokens.colors.gray.gray6}
        >
          {token.prefix}…
        </Text>
      </YStack>
      <YStack paddingBlockStart={2}>
        <Text
          fontSize={tokens.typography.fontSize.xs}
          color={tokens.colors.gray.gray6}
        >
          {token.metaLabel}
        </Text>
      </YStack>
    </YStack>
    {token.revoked || !onRevoke ? null : (
      <SectionButton
        variant="danger"
        disabled={revoking}
        onPress={onRevoke}
      >
        {revoking ? 'Revoking…' : 'Revoke'}
      </SectionButton>
    )}
  </XStack>
);

export const AccessTokensPanel = ({
  tokens: accessTokens,
  loading = false,
  tokenName,
  onTokenNameChange,
  onCreate,
  isCreating = false,
  createdSecret,
  onDismissSecret,
  revokingId,
  onRevoke,
  error,
  planNotice,
}: AccessTokensPanelProps) => (
  <SectionCard title="API access tokens">
    <SectionAlert severity="info">
      Personal access tokens let apps and scripts use the Eciperay API —
      including the MCP server — without signing in each time. Treat them like
      passwords.
    </SectionAlert>
    {createdSecret ? (
      <YStack
        paddingTop="$4"
        paddingBottom="$4"
      >
        <YStack
          borderRadius={tokens.radii.md}
          borderWidth={1}
          borderColor={tokens.colors.warning.warning4}
          backgroundColor={tokens.colors.warning.warning1}
          padding="$4"
        >
          <YStack paddingBottom="$2">
            <Text
              fontSize={tokens.typography.fontSize.sm}
              fontWeight={tokens.typography.fontWeight.semibold}
              color={tokens.colors.warning.warning10}
            >
              Copy your new token now — you won&apos;t see it again.
            </Text>
          </YStack>
          <YStack paddingBottom="$1">
            <YStack
              borderRadius={tokens.radii.sm}
              backgroundColor="$surface"
              padding="$3"
            >
              <Text
                userSelect="text"
                color={tokens.colors.gray.gray10}
                style={{
                  fontFamily: tokens.typography.fontFamily.mono,
                  fontSize: tokens.typography.fontSize.sm,
                }}
              >
                {createdSecret}
              </Text>
            </YStack>
          </YStack>
          <YStack paddingBottom="$3">
            <Text
              fontSize={tokens.typography.fontSize.xs}
              color={tokens.colors.warning.warning9}
            >
              Long-press the token to copy it.
            </Text>
          </YStack>
          <XStack gap="$2">
            <SectionButton
              variant="secondary"
              onPress={onDismissSecret}
            >
              Done
            </SectionButton>
          </XStack>
        </YStack>
      </YStack>
    ) : null}
    {planNotice ? (
      <SectionAlert severity="info">{planNotice}</SectionAlert>
    ) : (
      <YStack paddingBottom="$4">
        <LabeledTextInput
          label="Token name"
          value={tokenName}
          onChangeText={onTokenNameChange}
          placeholder="e.g. Claude Desktop"
        />
        <YStack paddingTop="$3">
          <SectionButton
            variant="primary"
            disabled={!tokenName.trim() || createdSecret !== null || isCreating}
            onPress={onCreate}
          >
            Create token
          </SectionButton>
        </YStack>
      </YStack>
    )}
    {error ? (
      <SectionAlert
        severity="error"
        message={error}
      />
    ) : null}
    {loading ? (
      <Text
        fontSize={tokens.typography.fontSize.sm}
        color={tokens.colors.gray.gray6}
      >
        Loading tokens…
      </Text>
    ) : accessTokens.length === 0 ? (
      <Text textAlign="center">No tokens yet.</Text>
    ) : (
      <YStack>
        {accessTokens.map(token => (
          <TokenRow
            key={token.id}
            token={token}
            revoking={revokingId === token.id}
            {...(token.revoked
              ? {}
              : {
                  onRevoke: () => {
                    onRevoke(token.id);
                  },
                })}
          />
        ))}
      </YStack>
    )}
  </SectionCard>
);
