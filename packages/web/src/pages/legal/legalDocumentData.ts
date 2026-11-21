import {LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR_NAME} from '@eciperay/client';
import type {I18n} from '@lingui/core';
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
//
// Since #465 tranche 21, the wording itself flows through the
// Lingui catalogs: the content files are builder functions that
// resolve every span's text through `i18n._` at render time, and
// the shared frame/footer labels below resolve the same way. The
// en-US constants (`sharedFooter`, `legalDocumentFrameProps`,
// `legalOperatorIntroSpan`) remain as the locale-free defaults for
// callers that do not resolve copy (the recipeStatusCopy pattern).

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

/** The operator intro sentence, resolved through the Lingui catalogs. */
export const buildLegalOperatorIntroSpan = (i18n: I18n): LegalDocumentSpan =>
  textSpan(
    i18n._({
      id: 'legal.operatorIntro',
      message:
        'Eciperay is operated by {operatorName} ("we", "us", or "our"). Eciperay is not a registered legal entity.',
      values: {operatorName: LEGAL_OPERATOR_NAME},
    }),
  );

/**
 * The ONE shared BigFooter data object for every signed-out public surface
 * (#425): a DS page's own default footer omits the Do Not Sell link, so every
 * public host passes this object explicitly as the page's `footer` prop — the
 * Legal column carries all three legal links, including Do Not Sell or Share,
 * exactly as the legal pages have always rendered them. There are no app-store
 * or social links today (production ships none), so those sets are empty,
 * matching what the legal pages render now.
 */
export const sharedFooter: BigFooterData = {
  brand: {label: 'Eciperay', href: '/'},
  columns: [
    {
      title: 'Explore',
      links: [
        {label: 'Discover', href: '/discover'},
        {label: 'Home', href: '/'},
      ],
    },
    {
      title: 'Account',
      links: [
        {label: 'Sign in', href: '/login'},
        {label: 'Create account', href: '/signup'},
        {label: 'Pricing', href: '/pay'},
      ],
    },
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

/** The shared footer with its labels resolved through the Lingui catalogs. */
export const buildSharedFooter = (i18n: I18n): BigFooterData => ({
  brand: {label: 'Eciperay', href: '/'},
  columns: [
    {
      title: i18n._({id: 'legal.footerExploreColumnTitle', message: 'Explore'}),
      links: [
        {
          label: i18n._({id: 'legal.footerDiscoverLabel', message: 'Discover'}),
          href: '/discover',
        },
        {
          label: i18n._({id: 'legal.footerHomeLabel', message: 'Home'}),
          href: '/',
        },
      ],
    },
    {
      title: i18n._({id: 'legal.footerAccountColumnTitle', message: 'Account'}),
      links: [
        {
          label: i18n._({id: 'legal.signInLabel', message: 'Sign in'}),
          href: '/login',
        },
        {
          label: i18n._({
            id: 'legal.footerCreateAccountLabel',
            message: 'Create account',
          }),
          href: '/signup',
        },
        {
          label: i18n._({id: 'legal.footerPricingLabel', message: 'Pricing'}),
          href: '/pay',
        },
      ],
    },
    {
      title: i18n._({id: 'legal.footerColumnTitle', message: 'Legal'}),
      links: [
        {
          label: i18n._({id: 'privacyPolicy.title', message: 'Privacy Policy'}),
          href: '/privacy',
        },
        {
          label: i18n._({
            id: 'termsOfService.title',
            message: 'Terms of Service',
          }),
          href: '/terms',
        },
        {
          label: i18n._({
            id: 'legal.doNotSellLabel',
            message: 'Do Not Sell or Share My Personal Information',
          }),
          href: '/privacy/consent',
        },
      ],
    },
  ],
  storeLinks: [],
  socialLinks: [],
});

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

/** The legal page's frame props, resolved through the Lingui catalogs. */
export const buildLegalDocumentFrameProps = (
  i18n: I18n,
): typeof legalDocumentFrameProps => ({
  brandLabel: 'Eciperay',
  brandHref: '/',
  signInLabel: i18n._({id: 'legal.signInLabel', message: 'Sign in'}),
  signInHref: '/login',
  footer: buildSharedFooter(i18n),
});
