import {queryKeys} from '@recipoo/client';
import clsx from 'clsx';
import {useQuery} from '@tanstack/react-query';
import {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {recipoo} from '../lib/api.js';

const ProgressDots = ({total, current}: {total: number; current: number}) => (
  <div className="mb-6 flex justify-center gap-2">
    {Array.from({length: total}).map((_, i) => (
      <div
        key={i}
        className={clsx('size-2 rounded-full', {
          'bg-white': i === current,
          'bg-white/40': i !== current,
        })}
      />
    ))}
  </div>
);

export const CookingModePage = () => {
  const {recipeId = ''} = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const {data: recipe} = useQuery({
    queryKey: queryKeys.recipe(recipeId),
    queryFn: () => recipoo.recipes.get(recipeId),
    enabled: recipeId.length > 0,
  });

  const steps = [...(recipe?.instructions ?? [])].sort(
    (a, b) => a.stepNumber - b.stepNumber,
  );
  const current = steps[step];

  const goNext = () => {
    setStep(s => Math.min(s + 1, steps.length - 1));
  };

  const goPrev = () => {
    setStep(s => Math.max(s - 1, 0));
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setStep(s => Math.min(s + 1, steps.length - 1));
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setStep(s => Math.max(s - 1, 0));
      }
      if (e.key === 'Escape') {
        void navigate(-1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [steps.length, navigate]);

  return (
    <div className="fixed inset-0 flex flex-col justify-center bg-gray-900 px-6">
      <button
        type="button"
        className="
          absolute right-6 top-6 rounded-full bg-white/10 px-4 py-2 text-sm
          text-white
        "
        onClick={() => {
          void navigate(-1);
        }}
      >
        Done
      </button>
      <p className="mb-4 text-sm uppercase tracking-widest text-white/60">
        Step {current ? current.stepNumber : 1} of {steps.length}
      </p>
      <p className="mb-8 text-2xl leading-relaxed text-white">
        {current ? current.body : ''}
      </p>
      <ProgressDots
        total={steps.length}
        current={step}
      />
      <div className="flex justify-between">
        <button
          type="button"
          className={clsx(
            `rounded-xl bg-white/10 px-6 py-3 text-base text-white`,
            {'opacity-30': step === 0},
          )}
          disabled={step === 0}
          onClick={goPrev}
        >
          ← Back
        </button>
        <button
          type="button"
          className={clsx(
            `rounded-xl bg-white/10 px-6 py-3 text-base text-white`,
            {'opacity-30': step === steps.length - 1},
          )}
          disabled={step === steps.length - 1}
          onClick={goNext}
        >
          Next →
        </button>
      </div>
    </div>
  );
};
