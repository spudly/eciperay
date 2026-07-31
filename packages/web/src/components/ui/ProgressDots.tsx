import type {ProgressDotsProps} from '@eciperay/client';
import clsx from 'clsx';

export const ProgressDots = ({
  total,
  current,
  variant = 'dark',
}: ProgressDotsProps) => (
  <div className="ui-progress-dots flex">
    {Array.from({length: total}).map((_, index) => (
      <div
        key={index}
        className={clsx('size-2 rounded-full', {
          'bg-white': variant === 'dark' && index === current,
          'bg-white/40': variant === 'dark' && index !== current,
          'bg-primary': variant === 'light' && index === current,
          'bg-gray-300': variant === 'light' && index !== current,
        })}
      />
    ))}
  </div>
);

if (import.meta.env.DEV) {
  ProgressDots.demo = function ProgressDotsDemo() {
    return (
      <div className="bg-gray-900 p-4">
        <ProgressDots
          total={5}
          current={2}
        />
      </div>
    );
  };
}
