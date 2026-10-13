export type PersonalAccessToken = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type PersonalAccessTokenWithSecret = PersonalAccessToken & {
  /** The plaintext token. Only returned once, at creation time. */
  token: string;
};
