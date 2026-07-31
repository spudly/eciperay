import type {SectionCardProps} from '@eciperay/client';
import clsx from 'clsx';

const variantClass: Record<NonNullable<SectionCardProps['variant']>, string> = {
  elevated: 'ui-section-card',
  bordered: 'ui-section-card-bordered',
  muted: 'ui-section-card-muted',
};

export const SectionCard = ({
  title,
  description,
  variant = 'elevated',
  children,
}: SectionCardProps) => (
  <section className={clsx('mbe-8', variantClass[variant])}>
    <h2 className="ui-section-card-title mbe-1">{title}</h2>
    {description ? (
      <p className="text-muted mbe-3 text-sm">{description}</p>
    ) : null}
    {children}
  </section>
);

if (import.meta.env.DEV) {
  SectionCard.demo = function SectionCardDemo() {
    return (
      <SectionCard title="Preferences">
        <p className="text-sm text-gray-700">Card content goes here.</p>
      </SectionCard>
    );
  };
}
