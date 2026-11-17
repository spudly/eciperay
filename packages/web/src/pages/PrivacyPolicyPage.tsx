import {useLingui} from '@lingui/react';
import {LegalDocumentPage} from '@spudly/ui';

import {StaticPageHead} from '../components/StaticPageHead.js';

import {legalDocumentFrameProps} from './legal/legalDocumentData.js';
import {privacyPolicySections} from './legal/privacyPolicyContent.js';

// The privacy policy's host (B7 cluster 11): the design system's
// LegalDocumentPage renders the document inside its own full
// frame (#170); the sections cross as structured data and the
// frame's brand/sign-in/footer links are app-supplied. The document's
// title and last-updated line are page-unique copy that flow through
// the Lingui catalogs (#465 tranche 3: explicit ids
// `privacyPolicy.title` / `privacyPolicy.lastUpdated`); the section
// bodies remain structured data for now.
export const PrivacyPolicyPage = () => {
  const {i18n} = useLingui();
  return (
    <>
      <StaticPageHead path="/privacy" />
      <LegalDocumentPage
        title={i18n._({
          id: 'privacyPolicy.title',
          message: 'Privacy Policy',
        })}
        lastUpdated={i18n._({
          id: 'privacyPolicy.lastUpdated',
          message: 'November 4, 2026',
        })}
        sections={privacyPolicySections}
        {...legalDocumentFrameProps}
      />
    </>
  );
};
