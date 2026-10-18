import type {SectionCardProps} from '@eciperay/client';
import {SectionCard as DSSectionCard, Text as DSText} from '@spudly/ui';

import {InfoBanner} from './InfoBanner';

/**
 * Thin adapter over the DS SectionCard.
 *
 * The app variants map straight onto the DS Card appearance variants the DS
 * SectionCard forwards: elevated (shadow, no border — the old ui-section-card),
 * bordered (outline), and muted (page-background fill, no border — the original
 * ui-section-card-muted). The web mirror adapter forwards its `variant` the
 * same way (it previously translated through the deprecated `elevated` prop).
 *
 * The old description prop (rendered under the title) is composed into children
 * as DS hint text; the mb-8 card spacing is preserved.
 */
export const SectionCard = ({
  title,
  description,
  variant = 'elevated',
  children,
}: SectionCardProps) => (
  <DSSectionCard
    title={title}
    variant={variant}
    marginBottom="$8"
  >
    {description ? (
      <DSText
        variant="hint"
        marginBottom="$3"
      >
        {description}
      </DSText>
    ) : null}
    {children}
  </DSSectionCard>
);

if (__DEV__) {
  SectionCard.demo = () => (
    <SectionCard
      title="Preferences"
      description="Card description renders below the title."
    >
      <InfoBanner>Card content goes here.</InfoBanner>
    </SectionCard>
  );
}
