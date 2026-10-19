import type {PersonalAccessToken} from '@eciperay/types';

export type AccessTokensViewProps = {
  tokens: PersonalAccessToken[];
  isLoading: boolean;
  tokenName: string;
  onTokenNameChange: (value: string) => void;
  onCreate: () => void;
  isCreating: boolean;
  createdSecret: string | null;
  onDismissSecret: () => void;
  revokingId: string | null;
  onRevoke: (id: string) => void;
  error: string | null;
  /**
   * When set, the create form is replaced by this explainer (the user's plan
   * cannot create tokens, so a form would only 403). The existing token list
   * and revoke actions stay available. Null/absent shows the form — including
   * when the entitlement failed to load, so token management is never bricked
   * by an entitlement outage.
   */
  planNotice?: string | null;
};
