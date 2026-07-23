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

export const FeedbackBubble = () => {
  const {enabled} = useFeedbackShortcutEnabled();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (!enabled || !canShowFeedbackBubble()) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3">
      {open ? (
        <div
          className="
            w-[min(100vw-2rem,24rem)] rounded-2xl border border-gray-200
            bg-white p-4 shadow-lg
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
          bg-primary flex size-12 items-center justify-center rounded-full
          text-white shadow-lg
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
