// Parity note (design-system#124, B3a): the app renders the design
// system EditVersionPage shell; this web shell remains until B7.
import type {
  EditVersionViewProps,
  ShowcaseDemoRenderer,
} from '@eciperay/client';

import {ErrorText} from '../ui/ErrorText.js';
import {InfoBanner} from '../ui/InfoBanner.js';
import {PageTitle} from '../ui/PageTitle.js';
import {TextLinkButton} from '../ui/TextLinkButton.js';

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
      <div>
        <ErrorText>This version can no longer be edited.</ErrorText>
        {onBack ? (
          <TextLinkButton
            label="Back to recipe"
            onPress={onBack}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <PageTitle spacing="section">{`Edit Draft (v${versionNumber})`}</PageTitle>
      {showImportBanner && parentVersionNumber !== undefined ? (
        <InfoBanner>
          {`Editing draft (v${versionNumber}) based on imported v${parentVersionNumber}.`}
        </InfoBanner>
      ) : null}
      {changeSummary ? (
        <p className="text-muted mbe-6 text-sm">{changeSummary}</p>
      ) : null}
      {children}
    </div>
  );
};

if (import.meta.env.DEV) {
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
