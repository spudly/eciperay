// Parity note (design-system#124, B3a): the app renders the design
// system ManualEntryPage shell; this web shell remains until B7.
import type {ManualEntryViewProps} from '@eciperay/client';

import {PageTitle} from '../ui/PageTitle.js';
import {InfoBanner} from '../ui/InfoBanner.js';

export const ManualEntryView = ({children}: ManualEntryViewProps) => (
  <div>
    <PageTitle spacing="section">Manual Entry</PageTitle>
    {children}
  </div>
);

if (import.meta.env.DEV) {
  ManualEntryView.demo = function ManualEntryViewDemo() {
    return (
      <ManualEntryView>
        <InfoBanner>
          Recipe form body renders here on the real screen.
        </InfoBanner>
      </ManualEntryView>
    );
  };
}
