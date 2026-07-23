import {LegalDocumentPage} from '../components/LegalDocumentPage.js';

import {privacyPolicySections} from './legal/privacyPolicyContent.js';

export const PrivacyPolicyPage = () => {
  return (
    <LegalDocumentPage
      title="Privacy Policy"
      lastUpdated="July 22, 2026"
      sections={privacyPolicySections}
    />
  );
};
