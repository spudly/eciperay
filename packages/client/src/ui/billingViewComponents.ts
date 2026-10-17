import type {Entitlement} from '@eciperay/types';

export type SubscriptionViewProps = {
  entitlement: Entitlement | null;
  isLoading: boolean;
  isOpeningPortal: boolean;
  onManage: () => void;
  error: string | null;
  /**
   * Portal URL to present as a clickable link when the browser blocked the
   * pre-opened portal tab (popup blockers eat tabs opened after an async
   * request). Null when the tab opened normally.
   */
  portalUrl?: string | null;
};
