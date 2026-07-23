import {
  useAnalytics,
  validateUserFeedbackMessage,
  type SubmitUserFeedbackInput,
} from '@eciperay/client';
import {useState} from 'react';
import {Switch, Text, TextInput, TouchableOpacity, View} from 'react-native';

type FeedbackFormProps = {route?: string; onSubmitted?: () => void};

export const FeedbackForm = ({route, onSubmitted}: FeedbackFormProps) => {
  const analytics = useAnalytics();
  const [message, setMessage] = useState('');
  const [isBug, setIsBug] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
      <Text className="text-sm text-green-700">
        Thanks — we got your feedback.
      </Text>
    );
  }

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-900">
          What&apos;s on your mind?
        </Text>
        <TextInput
          className="
            min-h-32 rounded-lg border border-gray-300 bg-white px-3 py-2
            text-base text-gray-900
          "
          multiline
          textAlignVertical="top"
          value={message}
          onChangeText={setMessage}
          placeholder="Tell us what happened or what you'd like to see improved."
        />
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-gray-700">This is a bug</Text>
        <Switch
          value={isBug}
          onValueChange={setIsBug}
          accessibilityLabel="This is a bug"
        />
      </View>
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      <TouchableOpacity
        className="
          bg-primary items-center rounded-lg py-3
          disabled:opacity-50
        "
        disabled={submitting || validateUserFeedbackMessage(message) !== null}
        onPress={() => {
          void handleSubmit();
        }}
      >
        <Text className="text-base font-semibold text-white">
          {submitting ? 'Submitting…' : 'Submit feedback'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
