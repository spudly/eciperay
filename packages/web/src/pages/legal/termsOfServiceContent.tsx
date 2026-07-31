import {LEGAL_OPERATOR_NAME} from '@eciperay/client';

import type {LegalSection} from '../../components/LegalDocumentPage.js';
import {LegalProseList} from '../../components/legal/LegalProseList.js';

import {legalContactLink} from './legalContactLink.js';
import {legalOperatorIntro} from './legalOperatorIntro.js';

export const termsOfServiceSections: LegalSection[] = [
  {
    title: 'Agreement',
    content: (
      <p>
        {legalOperatorIntro} By creating an account or using Eciperay, you agree
        to these Terms of Service (&quot;Terms&quot;). If you do not agree, do
        not use the service.
      </p>
    ),
  },
  {
    title: 'The service',
    content: (
      <p>
        Eciperay is a personal recipe management application available on the
        web and mobile devices. Features may include recipe storage, import,
        scaling, tagging, image uploads, and AI-assisted editing. We may change,
        suspend, or discontinue features at any time.
      </p>
    ),
  },
  {
    title: 'Your account',
    content: (
      <LegalProseList>
        <li>You must provide accurate account information.</li>
        <li>You are responsible for keeping your login credentials secure.</li>
        <li>
          You are responsible for activity that occurs under your account.
        </li>
        <li>You must be at least 13 years old to use Eciperay.</li>
      </LegalProseList>
    ),
  },
  {
    title: 'Your content',
    content: (
      <>
        <p>
          You retain ownership of recipes, images, and other content you submit
          (&quot;User Content&quot;). You grant us a limited license to host,
          store, process, and display your User Content solely to operate and
          improve the service, including providing AI-assisted features you
          request.
        </p>
        <p>
          You represent that you have the rights needed to submit your User
          Content and that it does not violate applicable law or the rights of
          others.
        </p>
      </>
    ),
  },
  {
    title: 'AI features',
    content: (
      <p>
        AI-generated suggestions may be inaccurate or incomplete. You are
        responsible for reviewing recipe content, especially food safety,
        allergens, and cooking instructions, before relying on it. AI output is
        provided &quot;as is&quot; without warranty.
      </p>
    ),
  },
  {
    title: 'Acceptable use',
    content: (
      <LegalProseList>
        <li>Do not use the service for unlawful purposes.</li>
        <li>Do not attempt to access other users&apos; accounts or data.</li>
        <li>
          Do not interfere with or disrupt the service, including by automated
          scraping or abuse.
        </li>
        <li>
          Do not upload malware or content that infringes others&apos; rights.
        </li>
      </LegalProseList>
    ),
  },
  {
    title: 'Termination',
    content: (
      <p>
        You may stop using Eciperay at any time. We may suspend or terminate
        your access if you violate these Terms or if necessary to protect the
        service or other users. You may request account deletion by contacting{' '}
        {legalContactLink}.
      </p>
    ),
  },
  {
    title: 'Disclaimers',
    content: (
      <p>
        Eciperay is provided on an &quot;as is&quot; and &quot;as
        available&quot; basis without warranties of any kind, whether express or
        implied, including merchantability, fitness for a particular purpose,
        and non-infringement. We do not guarantee that the service will be
        uninterrupted, secure, or error-free.
      </p>
    ),
  },
  {
    title: 'Limitation of liability',
    content: (
      <p>
        To the fullest extent permitted by law, {LEGAL_OPERATOR_NAME} will not
        be liable for any indirect, incidental, special, consequential, or
        punitive damages, or any loss of data, profits, or goodwill, arising
        from your use of the service.
      </p>
    ),
  },
  {
    title: 'Changes to these Terms',
    content: (
      <p>
        We may update these Terms from time to time. Continued use of Eciperay
        after changes become effective constitutes acceptance of the revised
        Terms. The current version will always be available on this page.
      </p>
    ),
  },
  {
    title: 'Contact',
    content: <p>Questions about these Terms? Email {legalContactLink}.</p>,
  },
];
