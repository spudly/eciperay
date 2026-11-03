import {
  readAnalyticsConsent,
  useFeedbackShortcutEnabled,
} from '@eciperay/client';
import {eciperayTheme, tokens} from '@spudly/ui';
import type {CSSProperties} from 'react';
import {useState} from 'react';
import {useLocation} from 'react-router-dom';

import {POSTHOG_KEY} from '../lib/env.js';

import {FeedbackForm} from './FeedbackForm.js';
import {Icon} from './Icon.js';

const canShowFeedbackBubble = () =>
  POSTHOG_KEY.length > 0 && readAnalyticsConsent() === 'accepted';

// Style objects on DS tokens (B7 C12, design-system#130 — the Tailwind
// utilities these replace are gone with the dependency).
const bubbleContainerStyle: CSSProperties = {
  position: 'fixed',
  right: tokens.spacing[4],
  // 5rem: clears the bottom-pinned consent banner's space (was inset-be-20).
  bottom: 80,
  zIndex: 50,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: tokens.spacing[3],
};

// The panel's width/height live in the `.feedback-panel` rule in
// index.css, not here: their min()/dvh values are not representable in
// the jsdom style model the tests assert against (the same reason the
// branded loader's sizing lives in plain CSS). Everything else about
// the panel stays in this style object.
const panelStyle: CSSProperties = {
  overflowY: 'auto',
  borderRadius: 16,
  border: `1px solid ${eciperayTheme.semantic.border}`,
  backgroundColor: eciperayTheme.semantic.surface,
  padding: tokens.spacing[4],
  boxShadow:
    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
};

const bubbleButtonStyle: CSSProperties = {
  backgroundColor: eciperayTheme.semantic.primary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 9999,
  border: 'none',
  color: '#ffffff',
  cursor: 'pointer',
  boxShadow:
    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  width: tokens.spacing[12],
  height: tokens.spacing[12],
};

export const FeedbackBubble = () => {
  const {enabled} = useFeedbackShortcutEnabled();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (!enabled || !canShowFeedbackBubble()) {
    return null;
  }

  return (
    <div style={bubbleContainerStyle}>
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
          page's own ScrollView instead. The height covers the page content
          plus the host's Cancel button; FeedbackForm's flex column is what
          reserves Cancel's space inside it (#330 — the ScrollView's
          min-height:100% otherwise claims the whole panel and pushes Cancel
          below the fold). */}
      {open ? (
        <div
          className="feedback-panel"
          style={panelStyle}
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
        style={bubbleButtonStyle}
        aria-label="Send feedback"
        aria-expanded={open}
        onClick={() => {
          setOpen(current => !current);
        }}
      >
        <Icon
          name="message-circle"
          size={22}
        />
      </button>
    </div>
  );
};
