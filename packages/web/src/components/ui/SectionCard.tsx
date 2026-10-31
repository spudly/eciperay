import type {SectionCardProps} from '@eciperay/client';
import {Card as DSCard, Text as DSText, tokens} from '@spudly/ui';

/**
 * Adapter over the design-system Card. The local variants (`elevated`,
 * `bordered`, `muted`) map one-to-one onto the DS Card's `variant` prop. The
 * title's heading semantics come from the DS Text subheading variant itself —
 * since @spudly/ui 1.15 (design-system#256) it renders with role="heading" at
 * level 2, so wrapping it in a native h2 (as this adapter did before the bump)
 * nested two heading roles.
 *
 * The mb-8 card spacing is preserved, matching the app mirror adapter: stacked
 * section cards (e.g. the Profile page, #191) get a consistent gap instead of
 * sitting flush against each other.
 */
export const SectionCard = ({
  title,
  description,
  variant = 'elevated',
  children,
}: SectionCardProps) => (
  <DSCard
    variant={variant}
    marginBottom="$8"
  >
    <DSText
      variant="subheading"
      marginBottom={tokens.spacing[3]}
    >
      {title}
    </DSText>
    {description ? <DSText variant="hint">{description}</DSText> : null}
    {children}
  </DSCard>
);

if (import.meta.env.DEV) {
  SectionCard.demo = function SectionCardDemo() {
    return (
      <SectionCard title="Preferences">
        <DSText>Card content goes here.</DSText>
      </SectionCard>
    );
  };
}
