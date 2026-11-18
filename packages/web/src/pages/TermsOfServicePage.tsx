import {useLingui} from '@lingui/react';
import {LegalDocumentPage} from '@spudly/ui';

import {StaticPageHead} from '../components/StaticPageHead.js';

import {buildLegalDocumentFrameProps} from './legal/legalDocumentData.js';
import {buildTermsOfServiceSections} from './legal/termsOfServiceContent.js';

// The terms of service's host (B7 cluster 11): the design system's
// LegalDocumentPage renders the document inside its own full
// frame (#170); the sections cross as structured data and the
// frame's brand/sign-in/footer links are app-supplied. The document's
// copy flows through the Lingui catalogs: title and last-updated
// line since #465 tranche 4 (explicit ids `termsOfService.title` /
// `termsOfService.lastUpdated`), and the section bodies plus the
// shared frame/footer labels since tranche 21 — the sections are
// built at render time so every span resolves through the catalogs.
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
        sections={buildTermsOfServiceSections(i18n)}
        {...buildLegalDocumentFrameProps(i18n)}
      />
    </>
  );
};
