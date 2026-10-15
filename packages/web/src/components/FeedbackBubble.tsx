import {
  readAnalyticsConsent,
  useFeedbackShortcutEnabled,
} from '@eciperay/client';
import {useState} from 'react';
import {useLocation} from 'react-router-dom';

import {POSTHOG_KEY} from '../lib/env.js';

import {FeedbackForm} from './FeedbackForm.js';
import {Icon} from './Icon.js';

const canShowFeedbackBubble = () =>
  POSTHOG_KEY.length > 0 && readAnalyticsConsent() === 'accepted';

// Extracted so prettier and the better-tailwindcss line-wrapping rule do not
// fight over the attribute string (same pattern as LegalLinks' linkClasses).
const bubbleContainerClasses =
  'fixed inset-e-4 inset-be-20 z-50 flex flex-col items-end gap-3';

export const FeedbackBubble = () => {
  const {enabled} = useFeedbackShortcutEnabled();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (!enabled || !canShowFeedbackBubble()) {
    return null;
  }

  return (
    <div className={bubbleContainerClasses}>
      {open ? (
        <div
          className="
            rounded-2xl border border-gray-200 bg-white p-4 shadow-lg
            inline-[min(100vw-2rem,24rem)]
          "
          role="dialog"
          aria-label="Send feedback"
        >
          <FeedbackForm
            route={location.pathname}
            onSubmitted={() => {
              setOpen(false);
            }}
            onCancel={() => {
              setOpen(false);
            }}
          />
        </div>
      ) : null}
      <button
        type="button"
        className="
          bg-primary flex items-center justify-center rounded-full text-white
          shadow-lg block-12 inline-12
        "
        aria-label="Send feedback"
        aria-expanded={open}
        onClick={() => {
          setOpen(current => !current);
        }}
      >
        <Icon
          name="message-circle"
          size={22}
          className="text-white"
        />
      </button>
    </div>
  );
};
