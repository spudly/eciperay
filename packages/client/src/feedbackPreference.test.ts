import {
  FEEDBACK_SHORTCUT_STORAGE_KEY,
  readFeedbackShortcutEnabled,
  writeFeedbackShortcutEnabled,
} from './feedbackPreference.js';

describe('feedbackPreference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('defaults to disabled when unset', () => {
    expect(readFeedbackShortcutEnabled()).toBe(false);
  });

  test('reads and writes the enabled preference', () => {
    writeFeedbackShortcutEnabled(true);
    expect(localStorage.getItem(FEEDBACK_SHORTCUT_STORAGE_KEY)).toBe('true');
    expect(readFeedbackShortcutEnabled()).toBe(true);
    writeFeedbackShortcutEnabled(false);
    expect(localStorage.getItem(FEEDBACK_SHORTCUT_STORAGE_KEY)).toBeNull();
    expect(readFeedbackShortcutEnabled()).toBe(false);
  });
});
