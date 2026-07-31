import {
  useAnalytics,
  validateUserFeedbackMessage,
  type ShowcaseFrameProps,
  type SubmitUserFeedbackInput,
} from '@eciperay/client';
import clsx from 'clsx';
import {useState} from 'react';
import type {ComponentType} from 'react';

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
            min-h-28 rounded-lg border border-gray-300 px-3 py-2 text-sm
            text-gray-900
          "
          value={message}
          onChange={event => {
            setMessage(event.target.value);
          }}
          placeholder="Tell us what happened or what you'd like to see improved."
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={isBug}
          onChange={event => {
            setIsBug(event.target.checked);
          }}
        />
        This is a bug
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        {onCancel ? (
          <button
            type="button"
            className="
              rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium
              text-gray-800
            "
            onClick={onCancel}
          >
            Cancel
          </button>
        ) : null}
        <button
          type="button"
          className="
            bg-primary rounded-lg px-4 py-2 text-sm font-medium text-white
            disabled:opacity-50
          "
          disabled={submitting || validateUserFeedbackMessage(message) !== null}
          onClick={() => {
            void handleSubmit();
          }}
        >
          {submitting ? 'Submitting…' : submitLabel}
        </button>
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
