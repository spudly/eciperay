import clsx from 'clsx';

type Props = {total: number; current: number};

export const ProgressDots = ({total, current}: Props) => (
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
