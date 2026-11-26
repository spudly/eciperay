export type FeedbackShortcutStorage = {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
};

export const FEEDBACK_SHORTCUT_STORAGE_KEY = 'eciperay.feedbackShortcutEnabled';

export const readFeedbackShortcutEnabled = async (
  storage: FeedbackShortcutStorage,
): Promise<boolean> => {
  const value = storage.getItem(FEEDBACK_SHORTCUT_STORAGE_KEY);
  const resolved = value instanceof Promise ? await value : value;
  return resolved === 'true';
};

export const writeFeedbackShortcutEnabled = async (
  storage: FeedbackShortcutStorage,
  enabled: boolean,
): Promise<void> => {
  if (enabled) {
    await storage.setItem(FEEDBACK_SHORTCUT_STORAGE_KEY, 'true');
    return;
  }
  await storage.removeItem(FEEDBACK_SHORTCUT_STORAGE_KEY);
};
