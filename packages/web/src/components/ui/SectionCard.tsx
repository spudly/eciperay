import type {SectionCardProps} from '@eciperay/client';
import {Card as DSCard, Text as DSText, tokens} from '@spudly/ui';

/**
 * Adapter over the design-system Card. The local variants (`elevated`,
 * `bordered`, `muted`) map one-to-one onto the DS Card's `variant` prop. The
 * title retains heading semantics via an h2 (the DS SectionCard renders titles
 * as plain text).
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
    <h2 style={{margin: 0, marginBottom: tokens.spacing[3]}}>
      <DSText variant="subheading">{title}</DSText>
    </h2>
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
