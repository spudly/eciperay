import {eciperayTheme, tokens} from '@spudly/ui';
import type {CSSProperties} from 'react';
import {useState} from 'react';
import type {CookLogInput} from '@eciperay/types';

import {StarRatingInput} from '../ui/StarRatingInput.js';

type Props = {
  onSubmit: (input: CookLogInput) => void;
  onSkip: () => void;
  isPending: boolean;
  variant?: 'dark' | 'light';
  secondaryLabel?: string;
};

// Parity note (design-system#126): the app no longer mirrors this
// form — it renders the design system CookLogForm — and this web
// implementation remains until web adoption in B7.
export const CookLogForm = ({
  onSubmit,
  onSkip,
  isPending,
  variant = 'dark',
  secondaryLabel = 'Skip',
}: Props) => {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [notes, setNotes] = useState('');
  const isLight = variant === 'light';

  // Style objects on DS tokens (B7 C12, design-system#130 — the Tailwind
  // utilities these replace are gone with the dependency). The textarea
  // placeholder color cannot be expressed in an inline style; it lives in
  // index.css under .cook-log-notes (plain CSS, like .book-loader).
  const containerStyle: CSSProperties = {
    marginLeft: 'auto',
    marginRight: 'auto',
    borderRadius: 16,
    padding: tokens.spacing[6],
    width: '100%',
    maxWidth: 448,
    boxSizing: 'border-box',
    ...(isLight
      ? {
          border: `1px solid ${tokens.colors.gray.gray3}`,
          backgroundColor: tokens.colors.gray.gray1,
        }
      : {backgroundColor: 'rgb(255 255 255 / 0.1)'}),
  };

  const notesStyle: CSSProperties = {
    marginBottom: tokens.spacing[4],
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.sans,
    width: '100%',
    boxSizing: 'border-box',
    ...(isLight
      ? {
          border: `1px solid ${tokens.colors.gray.gray4}`,
          backgroundColor: eciperayTheme.semantic.surface,
          color: tokens.colors.gray.gray10,
        }
      : {
          border: 'none',
          backgroundColor: 'rgb(255 255 255 / 0.1)',
          color: '#ffffff',
        }),
  };

  const skipStyle: CSSProperties = {
    flex: 1,
    borderRadius: 12,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: tokens.typography.fontSize.md,
    fontFamily: tokens.typography.fontFamily.sans,
    cursor: 'pointer',
    ...(isLight
      ? {
          border: `1px solid ${tokens.colors.gray.gray3}`,
          backgroundColor: '#ffffff',
          color: tokens.colors.gray.gray8,
        }
      : {
          border: 'none',
          backgroundColor: 'rgb(255 255 255 / 0.1)',
          color: '#ffffff',
        }),
  };

  return (
    <div style={containerStyle}>
      <h2
        style={{
          margin: 0,
          marginBottom: tokens.spacing[4],
          fontSize: tokens.typography.fontSize.xl,
          fontWeight: tokens.typography.fontWeight.semibold,
          color: isLight ? tokens.colors.gray.gray10 : '#ffffff',
        }}
      >
        How did it go?
      </h2>
      <div
        style={{
          marginBottom: tokens.spacing[4],
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <StarRatingInput
          value={rating}
          tone={isLight ? 'default' : 'dark'}
          onChange={star => {
            setRating(star as 1 | 2 | 3 | 4 | 5 | null);
          }}
        />
      </div>
      <textarea
        className="cook-log-notes"
        data-variant={isLight ? 'light' : 'dark'}
        style={notesStyle}
        placeholder="Notes from this cook (optional)"
        rows={3}
        value={notes}
        onChange={e => {
          setNotes(e.target.value);
        }}
      />
      <div style={{display: 'flex', gap: tokens.spacing[3]}}>
        <button
          type="button"
          style={skipStyle}
          onClick={onSkip}
        >
          {secondaryLabel}
        </button>
        <button
          type="button"
          style={{
            flex: 1,
            borderRadius: 12,
            border: 'none',
            paddingTop: 12,
            paddingBottom: 12,
            fontSize: tokens.typography.fontSize.md,
            fontFamily: tokens.typography.fontFamily.sans,
            fontWeight: tokens.typography.fontWeight.semibold,
            backgroundColor: eciperayTheme.semantic.primary,
            color: '#ffffff',
            cursor: 'pointer',
            opacity: isPending ? 0.5 : 1,
          }}
          disabled={isPending}
          onClick={() => {
            onSubmit({authorStarRating: rating, notes: notes.trim() || null});
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
};

if (import.meta.env.DEV) {
  CookLogForm.demo = function CookLogFormDemo() {
    return (
      <CookLogForm
        onSubmit={() => {
          void 0;
        }}
        onSkip={() => {
          void 0;
        }}
        isPending={false}
        variant="light"
      />
    );
  };
}
