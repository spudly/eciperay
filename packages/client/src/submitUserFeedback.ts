import type {AnalyticsAdapter} from './createAnalytics.js';
import type {AnalyticsPlatform} from './analyticsEvents.js';

export const USER_FEEDBACK_MESSAGE_MIN_LENGTH = 10;
export const USER_FEEDBACK_MESSAGE_MAX_LENGTH = 500;

export type SubmitUserFeedbackInput = {
  message: string;
  is_bug: boolean;
  route?: string;
};

export const validateUserFeedbackMessage = (message: string): string | null => {
  const trimmed = message.trim();
  if (trimmed.length < USER_FEEDBACK_MESSAGE_MIN_LENGTH) {
    return `Please enter at least ${USER_FEEDBACK_MESSAGE_MIN_LENGTH} characters.`;
  }
  if (trimmed.length > USER_FEEDBACK_MESSAGE_MAX_LENGTH) {
    return `Please keep feedback under ${USER_FEEDBACK_MESSAGE_MAX_LENGTH} characters.`;
  }
  return null;
};

export const submitUserFeedback = async (
  adapter: AnalyticsAdapter,
  platform: AnalyticsPlatform,
  input: SubmitUserFeedbackInput,
): Promise<{error: string | null}> => {
  const validationError = validateUserFeedbackMessage(input.message);
  if (validationError) {
    return {error: validationError};
  }

  await adapter.ensureSessionRecordingForFeedback?.();

  const sessionId = adapter.getSessionId?.();
  const replayUrl = adapter.getSessionReplayUrl?.();
  const route = input.route?.trim();

  adapter.capture('user_feedback', {
    message: input.message.trim(),
    is_bug: input.is_bug,
    platform,
    ...(route ? {route} : {}),
    ...(sessionId ? {session_id: sessionId} : {}),
    ...(replayUrl ? {replay_url: replayUrl} : {}),
  });

  return {error: null};
};
