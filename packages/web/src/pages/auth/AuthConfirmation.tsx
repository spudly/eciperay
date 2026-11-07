import {AuthConfirmationPage} from '@spudly/ui';
import type {MouseEvent} from 'react';

type AuthConfirmationProps = {
  title: string;
  body: string;
  backLabel?: string;
  onBackPress?: () => void;
};

/**
 * Host-rendered post-submit state for the auth flows (B7 cluster C3,
 * design-system#130). The design system auth pages report the submit intent
 * only — the confirmation states (sign-up email sent, reset-link sent, password
 * updated) are host state, the same split the native app applies (its screens
 * alert and navigate instead of rendering a DS confirmation view).
 *
 * The DS AuthConfirmationPage renders the state in the same auth shell as the
 * form it follows. Its way back crosses as an href (the DS navigation rule),
 * while this host's contract stays a press callback — the callers navigate
 * through the router — so the host renders the page with a placeholder href and
 * intercepts the back link's activation in the capture phase, routing it to the
 * caller's callback instead of letting the browser follow the placeholder. The
 * wrapper generates no box (`display: contents`), so the page's layout is
 * untouched.
 */
export const AuthConfirmation = ({
  title,
  body,
  backLabel,
  onBackPress,
}: AuthConfirmationProps) => {
  if (!backLabel || !onBackPress) {
    return (
      <AuthConfirmationPage
        title={title}
        body={body}
      />
    );
  }

  const handleBackClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest('a')) {
      event.preventDefault();
      onBackPress();
    }
  };

  return (
    <div
      style={{display: 'contents'}}
      onClickCapture={handleBackClickCapture}
    >
      <AuthConfirmationPage
        title={title}
        body={body}
        backLabel={backLabel}
        backHref="#"
      />
    </div>
  );
};
