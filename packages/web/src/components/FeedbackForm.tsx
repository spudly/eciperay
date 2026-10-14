import {
  useAnalytics,
  validateUserFeedbackMessage,
  type ShowcaseFrameProps,
  type SubmitUserFeedbackInput,
} from '@eciperay/client';
import clsx from 'clsx';
import {useState} from 'react';
import type {ComponentType} from 'react';

import {CheckboxField} from './ui/CheckboxField.js';
import {PrimaryButton} from './ui/PrimaryButton.js';
import {SecondaryButton} from './ui/SecondaryButton.js';

type FeedbackFormProps = {
  route?: string;
  /** Called after feedback is successfully submitted */
  onSubmitted?: () => void;
  onCancel?: () => void;
  className?: string;
  submitLabel?: string;
};

export const FeedbackForm = ({
  route,
  onSubmitted,
  onCancel,
  className,
  submitLabel = 'Submit feedback',
}: FeedbackFormProps) => {
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
    window.setTimeout(() => {
      onSubmitted?.();
    }, 1500);
  };

  if (submitted) {
    return (
      <div className={clsx('text-sm text-green-700', className)}>
        Thanks — we got your feedback.
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col gap-3', className)}>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-900">
          What&apos;s on your mind?
        </span>
        <textarea
          className="
            rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900
            min-block-28
          "
          value={message}
          onChange={event => {
            setMessage(event.target.value);
          }}
          placeholder="Tell us what happened or what you'd like to see improved."
        />
      </label>
      <CheckboxField
        checked={isBug}
        onChange={setIsBug}
        label="This is a bug"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        {onCancel ? (
          <SecondaryButton
            label="Cancel"
            onPress={onCancel}
          />
        ) : null}
        <PrimaryButton
          label={submitting ? 'Submitting…' : submitLabel}
          onPress={() => {
            void handleSubmit();
          }}
          disabled={submitting || validateUserFeedbackMessage(message) !== null}
          loading={submitting}
        />
      </div>
    </div>
  );
};

if (import.meta.env.DEV) {
  FeedbackForm.demo = function FeedbackFormDemo({
    Frame,
  }: {
    Frame: ComponentType<ShowcaseFrameProps>;
  }) {
    return (
      <Frame>
        <FeedbackForm route="/dev/components" />
      </Frame>
    );
  };
}
