import {LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR_NAME} from '@eciperay/client';
import type {
  BigFooterData,
  LegalDocumentBlock,
  LegalDocumentSpan,
} from '@spudly/ui';

// Builders for the legal documents' structured block model (#170):
// the DS LegalDocumentPage renders sections of paragraph/list
// blocks built from text/strong/code/link spans; the words stay
// app-side as data. These helpers keep the two content files
// readable — each document reads as its sections, paragraphs, and
// list items, with the inline semantics named at the span.

export const textSpan = (text: string): LegalDocumentSpan => ({
  type: 'text',
  text,
});

export const strongSpan = (text: string): LegalDocumentSpan => ({
  type: 'strong',
  text,
});

export const codeSpan = (text: string): LegalDocumentSpan => ({
  type: 'code',
  text,
});

export const paragraphBlock = (
  spans: LegalDocumentSpan[],
): LegalDocumentBlock => ({type: 'paragraph', spans});

export const listBlock = (
  items: LegalDocumentSpan[][],
): LegalDocumentBlock => ({type: 'list', items});

export const listItem = (spans: LegalDocumentSpan[]): LegalDocumentSpan[] =>
  spans;

/** The contact address as a link span (the retired LegalInlineLink). */
export const legalContactLinkSpan: LegalDocumentSpan = {
  type: 'link',
  label: LEGAL_CONTACT_EMAIL,
  href: `mailto:${LEGAL_CONTACT_EMAIL}`,
};

/** The operator intro sentence both documents open with. */
export const legalOperatorIntroSpan: LegalDocumentSpan = textSpan(
  `Eciperay is operated by ${LEGAL_OPERATOR_NAME} ("we", "us", or "our"). Eciperay is not a registered legal entity.`,
);

/**
 * The ONE shared BigFooter data object for every signed-out public surface
 * (#425): the DS PublicPageFrame's DEFAULT footer omits the Do Not Sell link,
 * so every public host passes this object explicitly — the Legal column carries
 * all three legal links, including Do Not Sell or Share, exactly as the legal
 * pages have always rendered them. There are no app-store or social links today
 * (production ships none), so those sets are empty, matching what the legal
 * pages render now.
 */
export const sharedFooter: BigFooterData = {
  brand: {label: 'Eciperay', href: '/'},
  columns: [
    {
      title: 'Legal',
      links: [
        {label: 'Privacy Policy', href: '/privacy'},
        {label: 'Terms of Service', href: '/terms'},
        {
          label: 'Do Not Sell or Share My Personal Information',
          href: '/privacy/consent',
        },
      ],
    },
  ],
  storeLinks: [],
  socialLinks: [],
};

/** The DS legal page's frame props, shared by both documents. */
export const legalDocumentFrameProps: {
  brandLabel: string;
  brandHref: string;
  signInLabel: string;
  signInHref: string;
  footer: BigFooterData;
} = {
  brandLabel: 'Eciperay',
  brandHref: '/',
  signInLabel: 'Sign in',
  signInHref: '/login',
  footer: sharedFooter,
};
