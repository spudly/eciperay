import {
  useAnalytics,
  useAuth,
  validateUserFeedbackMessage,
  validateUserFeedbackReplyEmail,
  type ShowcaseDemoRenderer,
  type SubmitUserFeedbackInput,
} from '@eciperay/client';
import {useFocusEffect} from '@react-navigation/native';
import {
  MultilineField as DsMultilineField,
  Text as DsText,
  tokens,
} from '@spudly/ui';
import {useCallback, useEffect, useState} from 'react';
import {YStack} from 'tamagui';

import {APP_VERSION} from '../lib/env';

import {CheckboxField} from './ui/CheckboxField';
import {ErrorText} from './ui/ErrorText';
import {PrimaryButton} from './ui/PrimaryButton';
import {TextField} from './ui/TextField';

type FeedbackFormProps = {
  route?: string;
  /** Called after feedback is successfully submitted */
  onSubmitted?: () => void;
};

export const FeedbackForm = ({route, onSubmitted}: FeedbackFormProps) => {
  const analytics = useAnalytics();
  const {session} = useAuth();
  const [message, setMessage] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [isBug, setIsBug] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const accountEmail = session?.user.email ?? '';
  // Pre-fill the reply address from the signed-in account until the user
  // edits the field themselves.
  useEffect(() => {
    setReplyEmail(current => (current === '' ? accountEmail : current));
  }, [accountEmail]);

  const userId = session?.user.id;

  const resetForm = useCallback(() => {
    setMessage('');
    setReplyEmail(accountEmail);
    setIsBug(false);
    setError(null);
    setSubmitting(false);
    setSubmitted(false);
  }, [accountEmail]);

  useFocusEffect(
    useCallback(() => {
      resetForm();
    }, [resetForm]),
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const trimmedReplyEmail = replyEmail.trim();
    const input: SubmitUserFeedbackInput = {
      message,
      is_bug: isBug,
      ...(route ? {route} : {}),
      ...(trimmedReplyEmail ? {reply_email: trimmedReplyEmail} : {}),
      ...(userId ? {user_id: userId} : {}),
      ...(APP_VERSION ? {app_version: APP_VERSION} : {}),
    };
    const result = await analytics.submitUserFeedback(input);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSubmitted(true);
    onSubmitted?.();
  };

  if (submitted) {
    return (
      <DsText
        fontSize={tokens.typography.fontSize.sm}
        color={tokens.colors.success.success8}
      >
        Thanks — we got your feedback.
      </DsText>
    );
  }

  return (
    <YStack gap="$4">
      <YStack gap="$2">
        <DsText
          fontSize={tokens.typography.fontSize.sm}
          fontWeight={tokens.typography.fontWeight.medium}
          color={tokens.colors.gray.gray10}
        >
          What&apos;s on your mind?
        </DsText>
        {/* DS field chrome replaces the old hand-rolled bordered input
            (the Stage 3a RecipeForm treatment); the old min-block-32
            sizing is covered by the field's default 4-line block. */}
        <DsMultilineField
          value={message}
          onChangeText={setMessage}
          placeholder="Tell us what happened or what you'd like to see improved."
        />
      </YStack>
      <TextField
        label="Email me back (optional)"
        type="email"
        value={replyEmail}
        onChange={setReplyEmail}
        placeholder="you@example.com"
      />
      <CheckboxField
        checked={isBug}
        onChange={setIsBug}
        label="This is a bug"
      />
      {error ? <ErrorText>{error}</ErrorText> : null}
      <PrimaryButton
        label="Submit feedback"
        loading={submitting}
        loadingLabel="Submitting…"
        disabled={
          validateUserFeedbackMessage(message) !== null ||
          validateUserFeedbackReplyEmail(replyEmail) !== null
        }
        onPress={() => {
          void handleSubmit();
        }}
      />
    </YStack>
  );
};

if (__DEV__) {
  const feedbackFormDemo: ShowcaseDemoRenderer = ({Frame}) => (
    <Frame>
      <FeedbackForm route="/dev/components" />
    </Frame>
  );
  FeedbackForm.demo = feedbackFormDemo;
}
