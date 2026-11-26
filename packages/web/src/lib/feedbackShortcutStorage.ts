import type {FeedbackShortcutStorage} from '@eciperay/client';

export const feedbackShortcutStorage: FeedbackShortcutStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
  },
};
