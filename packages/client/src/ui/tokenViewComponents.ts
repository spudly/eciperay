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
};
