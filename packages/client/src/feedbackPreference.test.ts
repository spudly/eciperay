import {
  FEEDBACK_SHORTCUT_STORAGE_KEY,
  readFeedbackShortcutEnabled,
  writeFeedbackShortcutEnabled,
  type FeedbackShortcutStorage,
} from './feedbackPreference.js';

const createMemoryStorage = (): FeedbackShortcutStorage & {
  entries: Map<string, string>;
} => {
  const entries = new Map<string, string>();
  return {
    entries,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
  };
};

describe('feedbackPreference', () => {
  test('defaults to disabled when unset', async () => {
    const storage = createMemoryStorage();
    await expect(readFeedbackShortcutEnabled(storage)).resolves.toBe(false);
  });

  test('reads and writes the enabled preference', async () => {
    const storage = createMemoryStorage();
    await writeFeedbackShortcutEnabled(storage, true);
    expect(storage.entries.get(FEEDBACK_SHORTCUT_STORAGE_KEY)).toBe('true');
    await expect(readFeedbackShortcutEnabled(storage)).resolves.toBe(true);
    await writeFeedbackShortcutEnabled(storage, false);
    expect(storage.entries.get(FEEDBACK_SHORTCUT_STORAGE_KEY)).toBeUndefined();
    await expect(readFeedbackShortcutEnabled(storage)).resolves.toBe(false);
  });

  test('works against an async storage', async () => {
    const entries = new Map<string, string>();
    const storage: FeedbackShortcutStorage = {
      getItem: async (key: string) => entries.get(key) ?? null,
      setItem: async (key: string, value: string) => {
        entries.set(key, value);
      },
      removeItem: async (key: string) => {
        entries.delete(key);
      },
    };
    await writeFeedbackShortcutEnabled(storage, true);
    await expect(readFeedbackShortcutEnabled(storage)).resolves.toBe(true);
  });
});
