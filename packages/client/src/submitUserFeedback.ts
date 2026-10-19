import type {AnalyticsAdapter} from './createAnalytics.js';
import type {AnalyticsPlatform} from './analyticsEvents.js';

export const USER_FEEDBACK_MESSAGE_MIN_LENGTH = 10;
export const USER_FEEDBACK_MESSAGE_MAX_LENGTH = 2000;

export type SubmitUserFeedbackInput = {
  message: string;
  is_bug: boolean;
  route?: string;
  /** Optional address the team can reply to; omitted from the event when blank. */
  reply_email?: string;
  /** Signed-in user's id, when the caller has an authenticated session. */
  user_id?: string;
  /** Caller's app version, from its package/build version source. */
  app_version?: string;
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

const REPLY_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateUserFeedbackReplyEmail = (
  replyEmail: string | undefined,
): string | null => {
  const trimmed = replyEmail?.trim() ?? '';
  if (trimmed.length === 0) {
    return null;
  }
  if (!REPLY_EMAIL_PATTERN.test(trimmed)) {
    return 'Please enter a valid email address.';
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

  const replyEmailError = validateUserFeedbackReplyEmail(input.reply_email);
  if (replyEmailError) {
    return {error: replyEmailError};
  }

  await adapter.ensureSessionRecordingForFeedback?.();

  const sessionId = adapter.getSessionId?.();
  const replayUrl = adapter.getSessionReplayUrl?.();
  const route = input.route?.trim();
  const replyEmail = input.reply_email?.trim();
  const userId = input.user_id?.trim();
  const appVersion = input.app_version?.trim();

  adapter.capture('user_feedback', {
    message: input.message.trim(),
    is_bug: input.is_bug,
    platform,
    ...(route ? {route} : {}),
    ...(replyEmail ? {reply_email: replyEmail} : {}),
    ...(userId ? {user_id: userId} : {}),
    ...(appVersion ? {app_version: appVersion} : {}),
    ...(sessionId ? {session_id: sessionId} : {}),
    ...(replayUrl ? {replay_url: replayUrl} : {}),
  });

  return {error: null};
};
