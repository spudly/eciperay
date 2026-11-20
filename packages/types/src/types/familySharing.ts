/**
 * Family sharing (#617): a standing designation from a recipe owner to one
 * recipient account. The recipient automatically sees the owner's whole
 * library (existing and future recipes, private included) in Shared With
 * Me, view/clone only. Revoking the designation deletes the grant row and
 * ends that access immediately; per-recipe grants are unaffected.
 */
export type FamilyShareGrant = {
  ownerUserId: string;
  recipientUserId: string;
  recipientEmail: string;
  recipientDisplayName: string | null;
  createdAt: string;
};

export type CreateFamilyShareInput = {
  email: string;
};

export type AccountExportFamilyShareGrant = {
  recipientUserId: string;
  recipientEmail: string;
  createdAt: string;
};
