import {useLingui} from '@lingui/react';
import {LegalDocumentPage} from '@spudly/ui';

import {StaticPageHead} from '../components/StaticPageHead.js';

import {legalDocumentFrameProps} from './legal/legalDocumentData.js';
import {termsOfServiceSections} from './legal/termsOfServiceContent.js';

// The terms of service's host (B7 cluster 11): the design system's
// LegalDocumentPage renders the document inside its own full
// frame (#170); the sections cross as structured data and the
// frame's brand/sign-in/footer links are app-supplied. The document's
// title and last-updated line are page-unique copy that flow through
// the Lingui catalogs (#465 tranche 4: explicit ids
// `termsOfService.title` / `termsOfService.lastUpdated`); the section
// bodies remain structured data for now.
export const TermsOfServicePage = () => {
  const {i18n} = useLingui();
  return (
    <>
      <StaticPageHead path="/terms" />
      <LegalDocumentPage
        title={i18n._({
          id: 'termsOfService.title',
          message: 'Terms of Service',
        })}
        lastUpdated={i18n._({
          id: 'termsOfService.lastUpdated',
          message: 'June 18, 2026',
        })}
        sections={termsOfServiceSections}
        {...legalDocumentFrameProps}
      />
    </>
  );
};
