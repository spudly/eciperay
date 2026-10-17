import {errorMessage, queryKeys} from '@eciperay/client';
import {useMutation, useQuery} from '@tanstack/react-query';
import {useState} from 'react';

import {eciperay} from '../../lib/api.js';

import {SubscriptionView} from './SubscriptionView.js';

export const ProfileSubscriptionSection = () => {
  const [portalError, setPortalError] = useState<string | null>(null);

  const entitlementQuery = useQuery({
    queryKey: queryKeys.entitlement(),
    queryFn: () => eciperay.account.getEntitlement(),
  });

  const portalMutation = useMutation({
    mutationFn: () => eciperay.billing.createPortalLink(),
    onSuccess: ({url}) => {
      setPortalError(null);
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    onError: mutationError => {
      setPortalError(errorMessage(mutationError));
    },
  });

  return (
    <SubscriptionView
      entitlement={entitlementQuery.data ?? null}
      isLoading={entitlementQuery.isLoading}
      isOpeningPortal={portalMutation.isPending}
      onManage={() => {
        portalMutation.mutate();
      }}
      error={
        portalError ??
        (entitlementQuery.error ? errorMessage(entitlementQuery.error) : null)
      }
    />
  );
};
