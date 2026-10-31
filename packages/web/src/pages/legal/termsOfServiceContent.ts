import {LEGAL_OPERATOR_NAME} from '@eciperay/client';
import type {LegalDocumentSection} from '@spudly/ui/pages';

import {
  legalContactLinkSpan,
  legalOperatorIntroSpan,
  listBlock,
  listItem,
  paragraphBlock,
  textSpan,
} from './legalDocumentData.js';

// The terms of service as structured data for the DS
// LegalDocumentPage (#170): the wording is the app's, carried over
// verbatim from the retired JSX content; only the form changed
// (sections of paragraph/list blocks built from spans).
export const termsOfServiceSections: LegalDocumentSection[] = [
  {
    title: 'Agreement',
    blocks: [
      paragraphBlock([
        legalOperatorIntroSpan,
        textSpan(
          ' By creating an account or using Eciperay, you agree to these Terms of Service ("Terms"). If you do not agree, do not use the service.',
        ),
      ]),
    ],
  },
  {
    title: 'The service',
    blocks: [
      paragraphBlock([
        textSpan(
          'Eciperay is a personal recipe management application available on the web and mobile devices. Features may include recipe storage, import, scaling, tagging, image uploads, and AI-assisted editing. We may change, suspend, or discontinue features at any time.',
        ),
      ]),
    ],
  },
  {
    title: 'Your account',
    blocks: [
      listBlock([
        listItem([textSpan('You must provide accurate account information.')]),
        listItem([
          textSpan('You are responsible for keeping your login credentials secure.'),
        ]),
        listItem([
          textSpan('You are responsible for activity that occurs under your account.'),
        ]),
        listItem([textSpan('You must be at least 13 years old to use Eciperay.')]),
      ]),
    ],
  },
  {
    title: 'Your content',
    blocks: [
      paragraphBlock([
        textSpan(
          'You retain ownership of recipes, images, and other content you submit ("User Content"). You grant us a limited license to host, store, process, and display your User Content solely to operate and improve the service, including providing AI-assisted features you request.',
        ),
      ]),
      paragraphBlock([
        textSpan(
          'You represent that you have the rights needed to submit your User Content and that it does not violate applicable law or the rights of others.',
        ),
      ]),
    ],
  },
  {
    title: 'AI features',
    blocks: [
      paragraphBlock([
        textSpan(
          'AI-generated suggestions may be inaccurate or incomplete. You are responsible for reviewing recipe content, especially food safety, allergens, and cooking instructions, before relying on it. AI output is provided "as is" without warranty.',
        ),
      ]),
    ],
  },
  {
    title: 'Acceptable use',
    blocks: [
      listBlock([
        listItem([textSpan('Do not use the service for unlawful purposes.')]),
        listItem([textSpan("Do not attempt to access other users' accounts or data.")]),
        listItem([
          textSpan(
            'Do not interfere with or disrupt the service, including by automated scraping or abuse.',
          ),
        ]),
        listItem([
          textSpan("Do not upload malware or content that infringes others' rights."),
        ]),
      ]),
    ],
  },
  {
    title: 'Termination',
    blocks: [
      paragraphBlock([
        textSpan(
          'You may stop using Eciperay at any time. We may suspend or terminate your access if you violate these Terms or if necessary to protect the service or other users. You may request account deletion by contacting ',
        ),
        legalContactLinkSpan,
        textSpan('.'),
      ]),
    ],
  },
  {
    title: 'Disclaimers',
    blocks: [
      paragraphBlock([
        textSpan(
          'Eciperay is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee that the service will be uninterrupted, secure, or error-free.',
        ),
      ]),
    ],
  },
  {
    title: 'Limitation of liability',
    blocks: [
      paragraphBlock([
        textSpan(
          `To the fullest extent permitted by law, ${LEGAL_OPERATOR_NAME} will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, profits, or goodwill, arising from your use of the service.`,
        ),
      ]),
    ],
  },
  {
    title: 'Changes to these Terms',
    blocks: [
      paragraphBlock([
        textSpan(
          'We may update these Terms from time to time. Continued use of Eciperay after changes become effective constitutes acceptance of the revised Terms. The current version will always be available on this page.',
        ),
      ]),
    ],
  },
  {
    title: 'Contact',
    blocks: [
      paragraphBlock([
        textSpan('Questions about these Terms? Email '),
        legalContactLinkSpan,
        textSpan('.'),
      ]),
    ],
  },
];
