export const FEEDBACK_SHORTCUT_STORAGE_KEY = 'eciperay.feedbackShortcutEnabled';

export const readFeedbackShortcutEnabled = (): boolean => {
  return localStorage.getItem(FEEDBACK_SHORTCUT_STORAGE_KEY) === 'true';
};

export const writeFeedbackShortcutEnabled = (enabled: boolean) => {
  if (enabled) {
    localStorage.setItem(FEEDBACK_SHORTCUT_STORAGE_KEY, 'true');
    return;
  }
  localStorage.removeItem(FEEDBACK_SHORTCUT_STORAGE_KEY);
};
