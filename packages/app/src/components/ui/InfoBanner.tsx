import type {InfoBannerProps} from '@eciperay/client';
import {Alert} from '@spudly/ui';

/**
 * Thin adapter over the DS Alert with info severity (the design system retired
 * InlineAlert in favor of Alert in @spudly/ui 1.15.0). The old mb-4 bottom
 * spacing is preserved.
 */
export const InfoBanner = ({children}: InfoBannerProps) => (
  <Alert
    severity="info"
    marginBottom="$4"
  >
    {children}
  </Alert>
);
