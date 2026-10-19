import {
  useAnalytics,
  useAuth,
  validateUserFeedbackMessage,
  validateUserFeedbackReplyEmail,
  type ShowcaseFrameProps,
  type SubmitUserFeedbackInput,
} from '@eciperay/client';
import clsx from 'clsx';
import {useEffect, useState} from 'react';
import type {ComponentType} from 'react';

import {APP_VERSION} from '../lib/env.js';

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
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-900">
          Email me back (optional)
        </span>
        <input
          type="email"
          className="
            rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900
          "
          value={replyEmail}
          onChange={event => {
            setReplyEmail(event.target.value);
          }}
          placeholder="you@example.com"
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
          disabled={
            submitting ||
            validateUserFeedbackMessage(message) !== null ||
            validateUserFeedbackReplyEmail(replyEmail) !== null
          }
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
