import type {ManualEntryViewProps} from '@eciperay/client';

import {PageTitle} from '../ui/PageTitle';
import {ScreenContainer} from '../ui/ScreenContainer';
import {InfoBanner} from '../ui/InfoBanner';

export const ManualEntryView = ({children}: ManualEntryViewProps) => (
  <ScreenContainer>
    <PageTitle spacing="section">Manual Entry</PageTitle>
    {children}
  </ScreenContainer>
);

if (__DEV__) {
  ManualEntryView.demo = () => (
    <ManualEntryView>
      <InfoBanner>Recipe form body renders here on the real screen.</InfoBanner>
    </ManualEntryView>
  );
}
