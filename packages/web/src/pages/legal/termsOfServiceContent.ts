import {LEGAL_OPERATOR_NAME} from '@eciperay/client';
import type {I18n} from '@lingui/core';
import type {LegalDocumentSection} from '@spudly/ui';

import {
  legalContactLinkSpan,
  buildLegalOperatorIntroSpan,
  listBlock,
  listItem,
  paragraphBlock,
  textSpan,
} from './legalDocumentData.js';

// The terms of service as structured data for the DS
// LegalDocumentPage (#170): the wording is the app's, carried over
// verbatim from the retired JSX content; only the form changed
// (sections of paragraph/list blocks built from spans). Since
// #465 tranche 21 the sections are built at render time, with
// every title and span resolved through the Lingui catalogs
// (explicit `termsOfService.*` ids; the wording is unchanged).
export const buildTermsOfServiceSections = (
  i18n: I18n,
): LegalDocumentSection[] => [
  {
    title: i18n._({id: 'termsOfService.agreementTitle', message: 'Agreement'}),
    blocks: [
      paragraphBlock([
        buildLegalOperatorIntroSpan(i18n),
        textSpan(
          i18n._({
            id: 'termsOfService.agreementBodyEnd',
            message:
              ' By creating an account or using Eciperay, you agree to these Terms of Service ("Terms"). If you do not agree, do not use the service.',
          }),
        ),
      ]),
    ],
  },
  {
    title: i18n._({id: 'termsOfService.serviceTitle', message: 'The service'}),
    blocks: [
      paragraphBlock([
        textSpan(
          i18n._({
            id: 'termsOfService.serviceBody',
            message:
              'Eciperay is a personal recipe management application available on the web and mobile devices. Features may include recipe storage, import, scaling, tagging, image uploads, and AI-assisted editing. We may change, suspend, or discontinue features at any time.',
          }),
        ),
      ]),
    ],
  },
  {
    title: i18n._({id: 'termsOfService.accountTitle', message: 'Your account'}),
    blocks: [
      listBlock([
        listItem([
          textSpan(
            i18n._({
              id: 'termsOfService.accountAccurate',
              message: 'You must provide accurate account information.',
            }),
          ),
        ]),
        listItem([
          textSpan(
            i18n._({
              id: 'termsOfService.accountCredentials',
              message:
                'You are responsible for keeping your login credentials secure.',
            }),
          ),
        ]),
        listItem([
          textSpan(
            i18n._({
              id: 'termsOfService.accountActivity',
              message:
                'You are responsible for activity that occurs under your account.',
            }),
          ),
        ]),
        listItem([
          textSpan(
            i18n._({
              id: 'termsOfService.accountAge',
              message: 'You must be at least 13 years old to use Eciperay.',
            }),
          ),
        ]),
      ]),
    ],
  },
  {
    title: i18n._({id: 'termsOfService.contentTitle', message: 'Your content'}),
    blocks: [
      paragraphBlock([
        textSpan(
          i18n._({
            id: 'termsOfService.contentOwnership',
            message:
              'You retain ownership of recipes, images, and other content you submit ("User Content"). You grant us a limited license to host, store, process, and display your User Content solely to operate and improve the service, including providing AI-assisted features you request.',
          }),
        ),
      ]),
      paragraphBlock([
        textSpan(
          i18n._({
            id: 'termsOfService.contentRights',
            message:
              'You represent that you have the rights needed to submit your User Content and that it does not violate applicable law or the rights of others.',
          }),
        ),
      ]),
    ],
  },
  {
    title: i18n._({id: 'termsOfService.aiTitle', message: 'AI features'}),
    blocks: [
      paragraphBlock([
        textSpan(
          i18n._({
            id: 'termsOfService.aiBody',
            message:
              'AI-generated suggestions may be inaccurate or incomplete. You are responsible for reviewing recipe content, especially food safety, allergens, and cooking instructions, before relying on it. AI output is provided "as is" without warranty.',
          }),
        ),
      ]),
    ],
  },
  {
    title: i18n._({
      id: 'termsOfService.acceptableUseTitle',
      message: 'Acceptable use',
    }),
    blocks: [
      listBlock([
        listItem([
          textSpan(
            i18n._({
              id: 'termsOfService.acceptableUnlawful',
              message: 'Do not use the service for unlawful purposes.',
            }),
          ),
        ]),
        listItem([
          textSpan(
            i18n._({
              id: 'termsOfService.acceptableAccess',
              message:
                "Do not attempt to access other users' accounts or data.",
            }),
          ),
        ]),
        listItem([
          textSpan(
            i18n._({
              id: 'termsOfService.acceptableInterfere',
              message:
                'Do not interfere with or disrupt the service, including by automated scraping or abuse.',
            }),
          ),
        ]),
        listItem([
          textSpan(
            i18n._({
              id: 'termsOfService.acceptableMalware',
              message:
                "Do not upload malware or content that infringes others' rights.",
            }),
          ),
        ]),
      ]),
    ],
  },
  {
    title: i18n._({
      id: 'termsOfService.terminationTitle',
      message: 'Termination',
    }),
    blocks: [
      paragraphBlock([
        textSpan(
          i18n._({
            id: 'termsOfService.terminationBodyStart',
            message:
              'You may stop using Eciperay at any time. We may suspend or terminate your access if you violate these Terms or if necessary to protect the service or other users. You may request account deletion by contacting ',
          }),
        ),
        legalContactLinkSpan,
        textSpan(i18n._({id: 'legal.period', message: '.'})),
      ]),
    ],
  },
  {
    title: i18n._({
      id: 'termsOfService.disclaimersTitle',
      message: 'Disclaimers',
    }),
    blocks: [
      paragraphBlock([
        textSpan(
          i18n._({
            id: 'termsOfService.disclaimersBody',
            message:
              'Eciperay is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee that the service will be uninterrupted, secure, or error-free.',
          }),
        ),
      ]),
    ],
  },
  {
    title: i18n._({
      id: 'termsOfService.liabilityTitle',
      message: 'Limitation of liability',
    }),
    blocks: [
      paragraphBlock([
        textSpan(
          i18n._({
            id: 'termsOfService.liabilityBody',
            message: `To the fullest extent permitted by law, {operatorName} will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, profits, or goodwill, arising from your use of the service.`,
            values: {operatorName: LEGAL_OPERATOR_NAME},
          }),
        ),
      ]),
    ],
  },
  {
    title: i18n._({
      id: 'termsOfService.changesTitle',
      message: 'Changes to these Terms',
    }),
    blocks: [
      paragraphBlock([
        textSpan(
          i18n._({
            id: 'termsOfService.changesBody',
            message:
              'We may update these Terms from time to time. Continued use of Eciperay after changes become effective constitutes acceptance of the revised Terms. The current version will always be available on this page.',
          }),
        ),
      ]),
    ],
  },
  {
    title: i18n._({id: 'termsOfService.contactTitle', message: 'Contact'}),
    blocks: [
      paragraphBlock([
        textSpan(
          i18n._({
            id: 'termsOfService.contactBodyStart',
            message: 'Questions about these Terms? Email ',
          }),
        ),
        legalContactLinkSpan,
        textSpan(i18n._({id: 'legal.period', message: '.'})),
      ]),
    ],
  },
];
