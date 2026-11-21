export type User = {
  id: string;
  supabaseUid: string;
  email: string;
  displayName: string | null;
  /** Admin (#621): gates tag management; defined by users.is_admin. */
  isAdmin: boolean;
  createdAt: string;
};

/**
 * How the user's name appears as the author of their public recipes.
 * `showOnPublicRecipes` gates whether the display name is exposed on public
 * recipe payloads (and therefore in Recipe JSON-LD `author`).
 */
export type AuthorDisplaySettings = {
  displayName: string | null;
  showOnPublicRecipes: boolean;
};
