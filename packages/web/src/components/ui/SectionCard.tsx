import type {SectionCardProps} from '@eciperay/client';
import {Card as DSCard, Text as DSText, tokens} from '@spudly/ui';

/**
 * Adapter over the design-system Card. The local `muted` variant has no
 * DS equivalent; it maps to a muted background color. The title retains
 * heading semantics via an h2 (the DS SectionCard renders titles as plain
 * text).
 */
export const SectionCard = ({
  title,
  description,
  variant = 'elevated',
  children,
}: SectionCardProps) => (
  <DSCard
    elevated={variant === 'elevated'}
    backgroundColor={
      variant === 'muted' ? tokens.colors.gray.gray2 : undefined
    }
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
