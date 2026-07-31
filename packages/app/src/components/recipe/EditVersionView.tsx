import type {
  EditVersionViewProps,
  ShowcaseDemoRenderer,
} from '@eciperay/client';
import {Text} from 'react-native';

import {ErrorText} from '../ui/ErrorText';
import {InfoBanner} from '../ui/InfoBanner';
import {PageTitle} from '../ui/PageTitle';
import {ScreenContainer} from '../ui/ScreenContainer';
import {ScreenScroll} from '../ui/ScreenScroll';
import {TextLinkButton} from '../ui/TextLinkButton';

export const EditVersionView = ({
  versionNumber,
  changeSummary,
  showImportBanner,
  parentVersionNumber,
  notEditable = false,
  onBack,
  children,
}: EditVersionViewProps) => {
  if (notEditable) {
    return (
      <ScreenContainer>
        <ErrorText>This version can no longer be edited.</ErrorText>
        {onBack ? (
          <TextLinkButton
            label="Back to recipe"
            onPress={onBack}
          />
        ) : null}
      </ScreenContainer>
    );
  }

  return (
    <ScreenScroll>
      <PageTitle spacing="section">{`Edit Draft (v${versionNumber})`}</PageTitle>
      {showImportBanner && parentVersionNumber !== undefined ? (
        <InfoBanner>
          {`Editing draft (v${versionNumber}) based on imported v${parentVersionNumber}.`}
        </InfoBanner>
      ) : null}
      {changeSummary ? (
        <Text className="text-muted mb-6 text-sm">{changeSummary}</Text>
      ) : null}
      {children}
    </ScreenScroll>
  );
};

if (__DEV__) {
  const editVersionViewDemo: ShowcaseDemoRenderer = () => (
    <EditVersionView
      versionNumber={2}
      changeSummary="Reduced sugar and added citrus."
      showImportBanner
      parentVersionNumber={1}
      onBack={() => {
        void 0;
      }}
    >
      <InfoBanner>
        Draft recipe editor renders here on the real screen.
      </InfoBanner>
    </EditVersionView>
  );
  EditVersionView.demo = editVersionViewDemo;
}
