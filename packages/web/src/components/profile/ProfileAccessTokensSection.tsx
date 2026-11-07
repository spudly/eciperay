import {
  apiTokensPowerNotice,
  errorMessage,
  queryKeys,
  useAuth,
} from '@eciperay/client';
import type {PersonalAccessToken} from '@eciperay/types';
import {tokens} from '@spudly/ui';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useId, useState} from 'react';
import type {ReactNode} from 'react';
import {Button, Input, Label, Text, XStack, YStack, styled} from 'tamagui';

import {eciperay} from '../../lib/api.js';

// This section mirrors the design system's AccessTokensPanel view
// (structure, rows, secret reveal, and copy) re-expressed with
// host-side Tamagui primitives: in @spudly/ui 6.x that view is
// internal to the design system and no exported page renders it, so
// the host composes the section itself pending page coverage for it.

const FieldInput = styled(Input, {
  name: 'ProfileTextField',

  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$textMuted',
  borderRadius: tokens.radii.md,
  paddingHorizontal: tokens.spacing[3],
  minHeight: 44,
  fontSize: tokens.typography.fontSize.md,
  color: '$color',
});

type AlertSeverity = 'info' | 'error';

const InlineAlert = ({
  severity,
  children,
  message,
}: {
  severity: AlertSeverity;
  children?: ReactNode;
  message?: string;
}) => {
  const isInfo = severity === 'info';
  return (
    <YStack
      borderWidth={1}
      borderRadius={tokens.radii.md}
      padding={tokens.spacing[3]}
      gap={tokens.spacing[2]}
      backgroundColor={isInfo ? '$primarySubtle' : tokens.colors.danger.danger1}
      borderColor={isInfo ? '$primary' : tokens.colors.danger.danger4}
    >
      <Text
        fontSize={tokens.typography.fontSize.md}
        color={isInfo ? '$primaryEmphasis' : tokens.colors.danger.danger8}
      >
        {children ?? message}
      </Text>
    </YStack>
  );
};

type PanelToken = {
  id: string;
  name: string;
  prefix: string;
  metaLabel: string;
  revoked: boolean;
};

const TokenRow = ({
  token,
  revoking,
  onRevoke,
}: {
  token: PanelToken;
  revoking: boolean;
  onRevoke?: () => void;
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
      <Button
        backgroundColor={tokens.colors.danger.danger7}
        borderColor="transparent"
        borderWidth={1}
        borderRadius={tokens.radii.md}
        color="#ffffff"
        fontSize={tokens.typography.fontSize.md}
        fontWeight={tokens.typography.fontWeight.semibold}
        paddingHorizontal={tokens.spacing[4]}
        paddingVertical={tokens.spacing[3]}
        opacity={revoking ? 0.5 : 1}
        disabled={revoking}
        onPress={onRevoke}
      >
        {revoking ? 'Revoking…' : 'Revoke'}
      </Button>
    )}
  </XStack>
);

const AccessTokensPanel = ({
  tokens: accessTokens,
  isLoading = false,
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
}: {
  tokens: PanelToken[];
  isLoading?: boolean;
  tokenName: string;
  onTokenNameChange: (value: string) => void;
  onCreate: () => void;
  isCreating?: boolean;
  createdSecret: string | null;
  onDismissSecret: () => void;
  revokingId?: string | null;
  onRevoke: (id: string) => void;
  error?: string | null;
  planNotice?: string | null;
}) => {
  const tokenNameId = useId();
  return (
    <YStack
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={tokens.radii.lg}
      padding={tokens.spacing[4]}
    >
      <YStack paddingBottom={tokens.spacing[3]}>
        <Text
          fontSize={tokens.typography.fontSize.xl}
          fontWeight={tokens.typography.fontWeight.semibold}
        >
          API access tokens
        </Text>
      </YStack>
      <YStack gap={tokens.spacing[3]}>
        <InlineAlert severity="info">
          Personal access tokens let apps and scripts use the Eciperay API —
          including the MCP server — without signing in each time. Treat them
          like passwords.
        </InlineAlert>
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
                <Button
                  backgroundColor={tokens.colors.gray.gray3}
                  borderColor={tokens.colors.gray.gray10}
                  borderWidth={1}
                  borderRadius={tokens.radii.md}
                  color={tokens.colors.gray.gray10}
                  fontSize={tokens.typography.fontSize.md}
                  fontWeight={tokens.typography.fontWeight.semibold}
                  paddingHorizontal={tokens.spacing[4]}
                  paddingVertical={tokens.spacing[3]}
                  onPress={onDismissSecret}
                >
                  Done
                </Button>
              </XStack>
            </YStack>
          </YStack>
        ) : null}
        {planNotice ? (
          <InlineAlert severity="info">{planNotice}</InlineAlert>
        ) : (
          <YStack paddingBottom="$4">
            <YStack gap={tokens.spacing[1]}>
              <Label
                htmlFor={tokenNameId}
                fontSize={tokens.typography.fontSize.sm}
              >
                Token name
              </Label>
              <FieldInput
                id={tokenNameId}
                value={tokenName}
                onChangeText={onTokenNameChange}
                placeholder="e.g. Claude Desktop"
                placeholderTextColor="$textMuted"
              />
            </YStack>
            <YStack paddingTop="$3">
              <Button
                backgroundColor="$primary"
                borderColor="transparent"
                borderWidth={1}
                borderRadius={tokens.radii.md}
                color="$onPrimary"
                fontSize={tokens.typography.fontSize.md}
                fontWeight={tokens.typography.fontWeight.semibold}
                paddingHorizontal={tokens.spacing[4]}
                paddingVertical={tokens.spacing[3]}
                opacity={
                  !tokenName.trim() || createdSecret !== null || isCreating
                    ? 0.5
                    : 1
                }
                disabled={
                  !tokenName.trim() || createdSecret !== null || isCreating
                }
                onPress={onCreate}
              >
                Create token
              </Button>
            </YStack>
          </YStack>
        )}
        {error ? (
          <InlineAlert
            severity="error"
            message={error}
          />
        ) : null}
        {isLoading ? (
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
      </YStack>
    </YStack>
  );
};

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

export const ProfileAccessTokensSection = () => {
  const {session} = useAuth();
  const queryClient = useQueryClient();
  const [tokenName, setTokenName] = useState('');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tokensQuery = useQuery({
    queryKey: queryKeys.personalAccessTokens(),
    queryFn: () => eciperay.account.listPersonalAccessTokens(),
  });

  // Token creation is Power-gated server-side. When the entitlement is
  // known to be below Power, show the explainer instead of a form that
  // would only fail with plan_required. When the entitlement is unknown
  // (still loading, or its fetch failed) planNotice stays null and the
  // form shows — token management is never bricked by an outage here.
  const userId = session?.user.id ?? 'anonymous';
  const entitlementQuery = useQuery({
    queryKey: queryKeys.entitlement(userId),
    queryFn: () => eciperay.account.getEntitlement(),
  });
  const planNotice =
    entitlementQuery.data && entitlementQuery.data.plan !== 'power'
      ? apiTokensPowerNotice(entitlementQuery.data.plan)
      : null;

  const invalidateTokens = () =>
    queryClient.invalidateQueries({queryKey: queryKeys.personalAccessTokens()});

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      eciperay.account.createPersonalAccessToken(name),
    onSuccess: data => {
      setCreatedSecret(data.token);
      setTokenName('');
      setError(null);
      void invalidateTokens();
    },
    onError: mutationError => {
      setError(errorMessage(mutationError));
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => eciperay.account.revokePersonalAccessToken(id),
    onSuccess: () => {
      setError(null);
      void invalidateTokens();
    },
    onError: mutationError => {
      setError(errorMessage(mutationError));
    },
  });

  return (
    <AccessTokensPanel
      tokens={(tokensQuery.data ?? []).map(token => ({
        id: token.id,
        name: token.name,
        prefix: token.tokenPrefix,
        metaLabel: describeToken(token),
        revoked: Boolean(token.revokedAt),
      }))}
      isLoading={tokensQuery.isLoading}
      tokenName={tokenName}
      onTokenNameChange={setTokenName}
      onCreate={() => {
        const name = tokenName.trim();
        if (name) {
          createMutation.mutate(name);
        }
      }}
      isCreating={createMutation.isPending}
      createdSecret={createdSecret}
      onDismissSecret={() => {
        setCreatedSecret(null);
      }}
      revokingId={revokeMutation.isPending ? revokeMutation.variables : null}
      onRevoke={id => {
        revokeMutation.mutate(id);
      }}
      error={
        error ?? (tokensQuery.error ? errorMessage(tokensQuery.error) : null)
      }
      planNotice={planNotice}
    />
  );
};
