import type {SectionCardProps} from '@eciperay/client';
import {SectionCard as DSSectionCard, Text as DSText, tokens} from '@spudly/ui';

import {InfoBanner} from './InfoBanner';

/**
 * Thin adapter over the DS SectionCard.
 *
 * Variant mapping:
 * - elevated -> DS elevated card (shadow, no border) — the old ui-section-card.
 * - bordered -> default DS card (bordered) — the old ui-section-card-bordered.
 * - muted -> default DS card on a gray-50 background — the old
 *   ui-section-card-muted.
 *
 * The old description prop (rendered under the title) is composed into
 * children as DS hint text; the mb-8 card spacing is preserved.
 */
export const SectionCard = ({
  title,
  description,
  variant = 'elevated',
  children,
}: SectionCardProps) => (
  <DSSectionCard
    title={title}
    elevated={variant === 'elevated'}
    backgroundColor={
      variant === 'muted' ? tokens.colors.gray.gray1 : undefined
    }
    marginBottom={tokens.spacing[8]}
  >
    {description ? (
      <DSText
        variant="hint"
        marginBottom={tokens.spacing[3]}
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
