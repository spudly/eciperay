import {
  useAnalytics,
  useAuth,
  validateUserFeedbackMessage,
  validateUserFeedbackReplyEmail,
  type SubmitUserFeedbackInput,
} from '@eciperay/client';
import {FeedbackPage, tokens} from '@spudly/ui';
import {useEffect, useRef, useState} from 'react';
import {Button} from 'tamagui';

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
    // Column layout (#330): the DS page's ScreenContainer ScrollView claims
    // min-height: 100% of the bubble panel, so as a plain sibling the Cancel
    // button flowed a full button-height (48px) below the panel's fold and
    // rendered partially clipped until the panel was scrolled. The flex
    // column reserves Cancel's space: the page wrapper flexes and may shrink
    // (min-h-0), so on tall viewports both actions fit inside the panel's
    // definite height with no scrolling, and on short viewports the page's
    // own ScrollView scrolls internally while Cancel stays visible.
    <div style={{display: 'flex', height: '100%', flexDirection: 'column'}}>
      <div
        style={{
          display: 'flex',
          minHeight: 0,
          // The flex:1 longhands, spelled out: the shorthand's expansion
          // is not observable in the jsdom style model the tests assert
          // against, and the longhands are the same layout contract.
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: '0%',
          flexDirection: 'column',
        }}
      >
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
      </div>
      {onCancel && !submitted ? (
        <Button
          backgroundColor={tokens.colors.gray.gray3}
          borderColor={tokens.colors.gray.gray10}
          borderWidth={1}
          borderRadius={tokens.radii.md}
          color={tokens.colors.gray.gray10}
          fontFamily="body"
          fontSize={tokens.typography.fontSize.md}
          fontWeight={tokens.typography.fontWeight.semibold}
          paddingHorizontal={tokens.spacing[4]}
          paddingVertical={tokens.spacing[3]}
          onPress={onCancel}
        >
          Cancel
        </Button>
      ) : null}
    </div>
  );
};
