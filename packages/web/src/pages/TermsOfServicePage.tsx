import {LegalDocumentPage} from '@spudly/ui/pages';

import {legalDocumentFrameProps} from './legal/legalDocumentData.js';
import {termsOfServiceSections} from './legal/termsOfServiceContent.js';

// The terms of service's host (B7 cluster 11): the design system's
// LegalDocumentPage renders the document inside its own full
// frame (#170); the sections cross as structured data and the
// frame's brand/sign-in/footer links are app-supplied.
export const TermsOfServicePage = () => {
  return (
    <LegalDocumentPage
      title="Terms of Service"
      lastUpdated="June 18, 2026"
      sections={termsOfServiceSections}
      {...legalDocumentFrameProps}
    />
  );
};
