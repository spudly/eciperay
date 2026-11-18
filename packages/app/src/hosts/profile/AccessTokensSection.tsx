import {
  apiTokensPowerNotice,
  errorMessage,
  queryKeys,
  useAuth,
} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';

import type {PersonalAccessToken} from '@eciperay/types';
import type {I18n} from '@lingui/core';
import {useLingui} from '@lingui/react';

import {api} from '../../lib/api';

import {AccessTokensPanel} from './AccessTokensPanel';

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

export const AccessTokensSection = () => {
  const {i18n} = useLingui();
  const {session} = useAuth();
  const queryClient = useQueryClient();
  const [tokenName, setTokenName] = useState('');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tokensQuery = useQuery({
    queryKey: queryKeys.personalAccessTokens(),
    queryFn: () => api.account.listPersonalAccessTokens(),
  });

  // Mirror of the web section: below Power, replace the create form with
  // the explainer; unknown entitlement (loading/failed) keeps the form.
  const userId = session?.user.id ?? 'anonymous';
  const entitlementQuery = useQuery({
    queryKey: queryKeys.entitlement(userId),
    queryFn: () => api.account.getEntitlement(),
  });
  const planNotice =
    entitlementQuery.data && entitlementQuery.data.plan !== 'power'
      ? apiTokensPowerNotice(entitlementQuery.data.plan)
      : null;

  const invalidateTokens = () =>
    queryClient.invalidateQueries({queryKey: queryKeys.personalAccessTokens()});

  const createMutation = useMutation({
    mutationFn: (name: string) => api.account.createPersonalAccessToken(name),
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
    mutationFn: (id: string) => api.account.revokePersonalAccessToken(id),
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
        metaLabel: describeToken(i18n, token),
        revoked: Boolean(token.revokedAt),
      }))}
      loading={tokensQuery.isLoading}
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
      onRevoke={(id: string) => {
        revokeMutation.mutate(id);
      }}
      error={
        error ?? (tokensQuery.error ? errorMessage(tokensQuery.error) : null)
      }
      planNotice={planNotice}
    />
  );
};
