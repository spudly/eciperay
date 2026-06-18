import {LegalDocumentPage} from '../components/LegalDocumentPage.js';

import {termsOfServiceSections} from './legal/termsOfServiceContent.js';

export const TermsOfServicePage = () => {
  return (
    <LegalDocumentPage
      title="Terms of Service"
      lastUpdated="June 18, 2026"
      sections={termsOfServiceSections}
    />
  );
};
