import clsx from 'clsx';
import {useState} from 'react';
import type {CookLogInput} from '@eciperay/types';

const STAR_RATINGS = [1, 2, 3, 4, 5] as const;

type Props = {
  onSubmit: (input: CookLogInput) => void;
  onSkip: () => void;
  isPending: boolean;
};

export const CookLogForm = ({onSubmit, onSkip, isPending}: Props) => {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [notes, setNotes] = useState('');

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white/10 p-6">
      <h2 className="mb-4 text-xl font-semibold text-white">How did it go?</h2>
      <div className="mb-4 flex justify-center gap-2">
        {STAR_RATINGS.map(star => (
          <button
            key={star}
            type="button"
            aria-label={`${star} stars`}
            className={clsx('text-2xl', {
              'text-yellow-400': rating !== null && star <= rating,
              'text-white/30': rating === null || star > rating,
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
        className="
          mb-4 w-full rounded-xl bg-white/10 px-4 py-3 text-base text-white
          placeholder:text-white/50
        "
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
          className="flex-1 rounded-xl bg-white/10 py-3 text-base text-white"
          onClick={onSkip}
        >
          Skip
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
