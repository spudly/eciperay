import {
  useAnalytics,
  useAuth,
  validateUserFeedbackMessage,
  validateUserFeedbackReplyEmail,
  type SubmitUserFeedbackInput,
} from '@eciperay/client';
import {Button} from '@spudly/ui';
import {FeedbackPage} from '@spudly/ui/pages';
import {useEffect, useRef, useState} from 'react';

import {APP_VERSION} from '../lib/env.js';

type FeedbackFormProps = {
  route?: string;
  /** Called after feedback is successfully submitted */
  onSubmitted?: () => void;
  onCancel?: () => void;
};

/**
 * Host for the design system FeedbackPage (B7 C10, design-system#130): the
 * analytics submission, the session-derived reply-email prefill rules, and
 * validation stay web-side; the view is the DS page. The bubble's Cancel
 * affordance is host-composed — the DS page has no cancel control (the app's
 * dedicated feedback screen exits via navigation), so the host renders it under
 * the page while editing.
 */
export const FeedbackForm = ({
  route,
  onSubmitted,
  onCancel,
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
  // Whether the user has edited the reply field themselves. An untouched
  // prefill tracks the signed-in account (fills when the session resolves,
  // updates on account switch, clears on sign-out); a deliberate edit —
  // including clearing the field — is preserved across account changes.
  const replyEditedRef = useRef(false);
  useEffect(() => {
    setReplyEmail(current => (replyEditedRef.current ? current : accountEmail));
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

  return (
    <>
      <FeedbackPage
        message={message}
        onMessageChange={setMessage}
        replyEmail={replyEmail}
        onReplyEmailChange={value => {
          replyEditedRef.current = true;
          setReplyEmail(value);
        }}
        isBug={isBug}
        onIsBugChange={setIsBug}
        error={error}
        submitting={submitting}
        submitted={submitted}
        submitDisabled={
          validateUserFeedbackMessage(message) !== null ||
          validateUserFeedbackReplyEmail(replyEmail) !== null
        }
        onSubmit={() => {
          void handleSubmit();
        }}
      />
      {onCancel && !submitted ? (
        <Button
          variant="secondary"
          onPress={onCancel}
        >
          Cancel
        </Button>
      ) : null}
    </>
  );
};
