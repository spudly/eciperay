import clsx from 'clsx';
import {useState} from 'react';
import type {CookLogInput} from '@eciperay/types';

const STAR_RATINGS = [1, 2, 3, 4, 5] as const;

type Props = {
  onSubmit: (input: CookLogInput) => void;
  onSkip: () => void;
  isPending: boolean;
  variant?: 'dark' | 'light';
  secondaryLabel?: string;
};

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

  return (
    <div
      className={clsx('mx-auto w-full max-w-md rounded-2xl p-6', {
        'bg-white/10': !isLight,
        'border border-gray-200 bg-gray-50': isLight,
      })}
    >
      <h2
        className={clsx('mb-4 text-xl font-semibold', {
          'text-white': !isLight,
          'text-gray-900': isLight,
        })}
      >
        How did it go?
      </h2>
      <div className="mb-4 flex justify-center gap-2">
        {STAR_RATINGS.map(star => (
          <button
            key={star}
            type="button"
            aria-label={`${star} stars`}
            className={clsx('text-2xl', {
              'text-yellow-400': rating !== null && star <= rating,
              'text-white/30': !isLight && (rating === null || star > rating),
              'text-gray-300': isLight && (rating === null || star > rating),
            })}
            onClick={() => {
              setRating(star);
            }}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className={clsx(
          'mb-4 w-full rounded-xl px-4 py-3 text-base',
          isLight
            ? `
              border border-gray-300 bg-white text-gray-900
              placeholder:text-gray-400
            `
            : `
              bg-white/10 text-white
              placeholder:text-white/50
            `,
        )}
        placeholder="Notes from this cook (optional)"
        rows={3}
        value={notes}
        onChange={e => {
          setNotes(e.target.value);
        }}
      />
      <div className="flex gap-3">
        <button
          type="button"
          className={clsx('flex-1 rounded-xl py-3 text-base', {
            'bg-white/10 text-white': !isLight,
            'border border-gray-200 bg-white text-gray-700': isLight,
          })}
          onClick={onSkip}
        >
          {secondaryLabel}
        </button>
        <button
          type="button"
          className="
            bg-primary flex-1 rounded-xl py-3 text-base font-semibold text-white
            disabled:opacity-50
          "
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
