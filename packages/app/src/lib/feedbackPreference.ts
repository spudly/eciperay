import {FEEDBACK_SHORTCUT_STORAGE_KEY} from '@eciperay/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const readFeedbackShortcutEnabled = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(FEEDBACK_SHORTCUT_STORAGE_KEY);
  return value === 'true';
};

export const writeFeedbackShortcutEnabled = async (enabled: boolean) => {
  if (enabled) {
    await AsyncStorage.setItem(FEEDBACK_SHORTCUT_STORAGE_KEY, 'true');
    return;
  }
  await AsyncStorage.removeItem(FEEDBACK_SHORTCUT_STORAGE_KEY);
};
