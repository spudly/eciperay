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
      {/* Panel block size is DEFINITE, not just capped (#326): the DS
          FeedbackPage's ScreenContainer ScrollView (flex:1, min-height:100%)
          collapses to a sliver inside a shrink-to-fit panel, because its
          percentage/flex sizing has no definite height to resolve against —
          a max-block-size alone left the panel height indefinite and the
          form rendered ~130px tall on tall viewports. The size is the
          form's measured natural height (35.125rem), capped at 100dvh minus
          the container's 5rem bottom offset, the 3rem bubble button, the
          0.75rem gap, and top clearance (10rem total) so the panel never
          overflows short viewports; taller content scrolls inside the
          page's own ScrollView instead. */}
      {open ? (
        <div
          className="
            overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4
            shadow-lg inline-[min(100vw-2rem,24rem)]
            block-[min(35.125rem,calc(100dvh-10rem))]
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
