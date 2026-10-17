import type {Entitlement} from '@eciperay/types';

export type SubscriptionViewProps = {
  entitlement: Entitlement | null;
  isLoading: boolean;
  isOpeningPortal: boolean;
  onManage: () => void;
  error: string | null;
};
