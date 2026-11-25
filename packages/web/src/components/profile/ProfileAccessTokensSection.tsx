import {
  apiTokensPowerNotice,
  errorMessage,
  queryKeys,
  useAuth,
} from '@eciperay/client';
import type {PersonalAccessToken} from '@eciperay/types';
import type {I18n} from '@lingui/core';
import {useLingui} from '@lingui/react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';

import {eciperay} from '../../lib/api.js';

// DS 14: ProfilePage renders the AccessTokensPanel itself from the
// `accessTokens` data prop (#511), so this module is now the
// section's host logic as a hook — the token and entitlement
// queries and the create/revoke mutations — returning the
// data-prop view-model. (The host-side Tamagui mirror of the panel
// is retired with the slot it filled; the security rule stands:
// token handling stays app-side, only display state crosses.)

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const describeToken = (i18n: I18n, token: PersonalAccessToken): string => {
  const parts = [
    i18n._({
      id: 'profile.tokenCreated',
      message: 'Created {date}',
      values: {date: formatDate(token.createdAt)},
    }),
  ];
  parts.push(
    token.lastUsedAt
      ? i18n._({
          id: 'profile.tokenLastUsed',
          message: 'Last used {date}',
          values: {date: formatDate(token.lastUsedAt)},
        })
      : i18n._({id: 'profile.tokenNeverUsed', message: 'Never used'}),
  );
  return parts.join(' · ');
};

export const useProfileAccessTokensProps = () => {
  const {i18n} = useLingui();
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

  return {
    tokens: (tokensQuery.data ?? []).map(token => ({
      id: token.id,
      name: token.name,
      prefix: token.tokenPrefix,
      metaLabel: describeToken(i18n, token),
      revoked: Boolean(token.revokedAt),
    })),
    loading: tokensQuery.isLoading,
    tokenName,
    onTokenNameChange: setTokenName,
    onCreate: () => {
      const name = tokenName.trim();
      if (name) {
        createMutation.mutate(name);
      }
    },
    isCreating: createMutation.isPending,
    createdSecret,
    onDismissSecret: () => {
      setCreatedSecret(null);
    },
    revokingId: revokeMutation.isPending ? revokeMutation.variables : null,
    onRevoke: (id: string) => {
      revokeMutation.mutate(id);
    },
    error:
      error ?? (tokensQuery.error ? errorMessage(tokensQuery.error) : null),
    planNotice,
  };
};
