import {
  useAnalytics,
  useAuth,
  validateUserFeedbackMessage,
  validateUserFeedbackReplyEmail,
  type SubmitUserFeedbackInput,
} from '@eciperay/client';
import {useFocusEffect} from '@react-navigation/native';
import {FeedbackPage} from '@spudly/ui/pages';
import {useCallback, useEffect, useRef, useState} from 'react';

import {APP_VERSION} from '../lib/env';

type FeedbackFormProps = {
  route?: string;
  /** Called after feedback is successfully submitted */
  onSubmitted?: () => void;
};

// Field backgrounds (issue #167): fields here render through @spudly/ui
// components, which all share the Warm Harvest $surface field background.
// The web mirror matches via its bg-field token (#fffdf8, the same surface).
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
  // Whether the user has edited the reply field themselves. An untouched
  // prefill tracks the signed-in account (fills when the session resolves,
  // updates on account switch, clears on sign-out); a deliberate edit —
  // including clearing the field — is preserved across account changes.
  const replyEditedRef = useRef(false);
  // Latest account email for the focus reset below, read through a ref so
  // the reset callback stays stable: a session change must not re-run the
  // focus effect and wipe an in-progress draft.
  const accountEmailRef = useRef(accountEmail);
  useEffect(() => {
    accountEmailRef.current = accountEmail;
    setReplyEmail(current => (replyEditedRef.current ? current : accountEmail));
  }, [accountEmail]);

  const userId = session?.user.id;

  const resetForm = useCallback(() => {
    setMessage('');
    replyEditedRef.current = false;
    setReplyEmail(accountEmailRef.current);
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

  return (
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
  );
};

