import clsx from 'clsx';
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
      className={clsx('mx-auto rounded-2xl p-6 inline-full max-inline-md', {
        'bg-white/10': !isLight,
        'border border-gray-200 bg-gray-50': isLight,
      })}
    >
      <h2
        className={clsx('mbe-4 text-xl font-semibold', {
          'text-white': !isLight,
          'text-gray-900': isLight,
        })}
      >
        How did it go?
      </h2>
      <div className="mbe-4 flex justify-center">
        <StarRatingInput
          value={rating}
          tone={isLight ? 'default' : 'dark'}
          onChange={star => {
            setRating(star as 1 | 2 | 3 | 4 | 5 | null);
          }}
        />
      </div>
      <textarea
        className={clsx(
          'mbe-4 rounded-xl px-4 py-3 text-base inline-full',
          isLight
            ? `
              border border-gray-300 bg-field text-gray-900
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
