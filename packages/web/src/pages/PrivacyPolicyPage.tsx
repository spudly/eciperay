import {LegalDocumentPage} from '@spudly/ui/pages';

import {legalDocumentFrameProps} from './legal/legalDocumentData.js';
import {privacyPolicySections} from './legal/privacyPolicyContent.js';

// The privacy policy's host (B7 cluster 11): the design system's
// LegalDocumentPage renders the document inside its own full
// frame (#170); the sections cross as structured data and the
// frame's brand/sign-in/footer links are app-supplied.
export const PrivacyPolicyPage = () => {
  return (
    <LegalDocumentPage
      title="Privacy Policy"
      lastUpdated="July 22, 2026"
      sections={privacyPolicySections}
      {...legalDocumentFrameProps}
    />
  );
};
