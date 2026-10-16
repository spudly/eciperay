import {
  useAnalytics,
  validateUserFeedbackMessage,
  type ShowcaseDemoRenderer,
  type SubmitUserFeedbackInput,
} from '@eciperay/client';
import {useFocusEffect} from '@react-navigation/native';
import {
  MultilineField as DsMultilineField,
  Text as DsText,
  tokens,
} from '@spudly/ui';
import {useCallback, useState} from 'react';
import {YStack} from 'tamagui';

import {CheckboxField} from './ui/CheckboxField';
import {ErrorText} from './ui/ErrorText';
import {PrimaryButton} from './ui/PrimaryButton';

type FeedbackFormProps = {
  route?: string;
  /** Called after feedback is successfully submitted */
  onSubmitted?: () => void;
};

export const FeedbackForm = ({route, onSubmitted}: FeedbackFormProps) => {
  const analytics = useAnalytics();
  const [message, setMessage] = useState('');
  const [isBug, setIsBug] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const resetForm = useCallback(() => {
    setMessage('');
    setIsBug(false);
    setError(null);
    setSubmitting(false);
    setSubmitted(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetForm();
    }, [resetForm]),
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const input: SubmitUserFeedbackInput = {
      message,
      is_bug: isBug,
      ...(route ? {route} : {}),
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
        disabled={validateUserFeedbackMessage(message) !== null}
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
