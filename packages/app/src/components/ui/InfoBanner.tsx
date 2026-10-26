import type {InfoBannerProps} from '@eciperay/client';
import {InlineAlert} from '@spudly/ui';

/**
 * Thin adapter over the DS InlineAlert with info severity. The old mb-4 bottom
 * spacing is preserved.
 */
export const InfoBanner = ({children}: InfoBannerProps) => (
  <InlineAlert
    severity="info"
    marginBottom="$4"
  >
    {children}
  </InlineAlert>
);
