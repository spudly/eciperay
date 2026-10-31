/**
 * Persistence for a meal plan's shopping-list check-off state (#323).
 *
 * The shopping list itself is derived server-side from the plan's current
 * recipes (there is no stored list and no checked field on `ShoppingListLine`),
 * and the manual test for this state only requires it to survive a reload /
 * navigating away and back on the web. Following the app's established pattern
 * for this kind of per-user UI state (analyticsConsent, feedbackPreference, and
 * the AI-session restore keys in AiSessionHost), the checked line keys are kept
 * in localStorage, keyed by user and plan so one account's checks never surface
 * for another account sharing the browser, and one plan's checks never leak
 * into another plan.
 */
export const shoppingListCheckedStorageKey = (
  userId: string,
  planId: string,
): string => `eciperay:shopping-list-checked:${userId}:${planId}`;

export const readShoppingListCheckedKeys = (
  userId: string,
  planId: string,
): Set<string> => {
  try {
    const raw = localStorage.getItem(
      shoppingListCheckedStorageKey(userId, planId),
    );
    if (!raw) {
      return new Set();
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(
      parsed.filter((value): value is string => typeof value === 'string'),
    );
  } catch {
    // Storage unavailable (private mode / quota) or a corrupt value: the
    // list simply starts unchecked, matching the pre-#323 behavior.
    return new Set();
  }
};

/**
 * Writes the checked set, returning whether it was persisted. Callers that keep
 * toggling after a failed write (storage unavailable — private mode / quota)
 * can use the false return to keep basing later toggles on their in-memory set
 * instead of re-reading a stale stored one.
 */
export const writeShoppingListCheckedKeys = (
  userId: string,
  planId: string,
  checkedKeys: ReadonlySet<string>,
): boolean => {
  try {
    const key = shoppingListCheckedStorageKey(userId, planId);
    if (checkedKeys.size === 0) {
      localStorage.removeItem(key);
      return true;
    }
    localStorage.setItem(key, JSON.stringify([...checkedKeys]));
    return true;
  } catch {
    // Storage unavailable (private mode / quota): the checked state
    // simply will not survive a reload.
    return false;
  }
};
