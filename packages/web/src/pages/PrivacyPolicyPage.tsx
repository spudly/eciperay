import {LegalDocumentPage} from '../components/LegalDocumentPage.js';

import {privacyPolicySections} from './legal/privacyPolicyContent.js';

export const PrivacyPolicyPage = () => {
  return (
    <LegalDocumentPage
      title="Privacy Policy"
      lastUpdated="June 18, 2026"
      sections={privacyPolicySections}
    />
  );
};
