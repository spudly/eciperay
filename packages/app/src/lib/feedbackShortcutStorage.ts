import type {FeedbackShortcutStorage} from '@eciperay/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const feedbackShortcutStorage: FeedbackShortcutStorage = AsyncStorage;
