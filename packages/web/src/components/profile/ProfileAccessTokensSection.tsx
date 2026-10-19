import {
  apiTokensPowerNotice,
  errorMessage,
  queryKeys,
  useAuth,
} from '@eciperay/client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';

import {eciperay} from '../../lib/api.js';

import {AccessTokensView} from './AccessTokensView.js';

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
    <AccessTokensView
      tokens={tokensQuery.data ?? []}
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
