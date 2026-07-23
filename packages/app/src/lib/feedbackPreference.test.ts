import AsyncStorage from '@react-native-async-storage/async-storage';
import {FEEDBACK_SHORTCUT_STORAGE_KEY} from '@eciperay/client';

import {
  readFeedbackShortcutEnabled,
  writeFeedbackShortcutEnabled,
} from './feedbackPreference';

describe('feedbackPreference', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('defaults to disabled when unset', async () => {
    await expect(readFeedbackShortcutEnabled()).resolves.toBe(false);
  });

  test('reads and writes the enabled preference', async () => {
    await writeFeedbackShortcutEnabled(true);
    await expect(
      AsyncStorage.getItem(FEEDBACK_SHORTCUT_STORAGE_KEY),
    ).resolves.toBe('true');
    await expect(readFeedbackShortcutEnabled()).resolves.toBe(true);
    await writeFeedbackShortcutEnabled(false);
    await expect(
      AsyncStorage.getItem(FEEDBACK_SHORTCUT_STORAGE_KEY),
    ).resolves.toBeNull();
    await expect(readFeedbackShortcutEnabled()).resolves.toBe(false);
  });
});
