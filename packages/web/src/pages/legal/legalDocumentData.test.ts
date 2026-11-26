import {setupI18n} from '@lingui/core';

import {buildSharedFooter, sharedFooter} from './legalDocumentData.js';

const expectedColumns = [
  {
    title: 'Explore',
    links: [
      {label: 'Discover', href: '/recipes'},
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
];

describe('sharedFooter', () => {
  test('orders Explore, Account, then Legal with the approved links (#619)', () => {
    expect(sharedFooter.columns).toEqual(expectedColumns);
    expect(sharedFooter.brand).toEqual({
      label: 'Eciperay',
      href: '/',
      mark: 'eciperay',
    });
  });

  test('buildSharedFooter resolves its labels through i18n, not literals', () => {
    // Distinct translated values (en-XA style) for every id the builder
    // resolves: if a label bypassed i18n and used the English literal,
    // this assertion would fail.
    const ids = [
      'legal.footerExploreColumnTitle',
      'legal.footerDiscoverLabel',
      'legal.footerHomeLabel',
      'legal.footerAccountColumnTitle',
      'legal.signInLabel',
      'legal.footerCreateAccountLabel',
      'legal.footerPricingLabel',
      'legal.footerColumnTitle',
      'privacyPolicy.title',
      'termsOfService.title',
      'legal.doNotSellLabel',
    ];
    const english: Record<string, string> = {
      'legal.footerExploreColumnTitle': 'Explore',
      'legal.footerDiscoverLabel': 'Discover',
      'legal.footerHomeLabel': 'Home',
      'legal.footerAccountColumnTitle': 'Account',
      'legal.signInLabel': 'Sign in',
      'legal.footerCreateAccountLabel': 'Create account',
      'legal.footerPricingLabel': 'Pricing',
      'legal.footerColumnTitle': 'Legal',
      'privacyPolicy.title': 'Privacy Policy',
      'termsOfService.title': 'Terms of Service',
      'legal.doNotSellLabel': 'Do Not Sell or Share My Personal Information',
    };
    const messages = Object.fromEntries(ids.map(id => [id, `${english[id]}~`]));
    const i18n = setupI18n({locale: 'en-XA', messages: {'en-XA': messages}});
    const translated = expectedColumns.map(column => ({
      title: `${column.title}~`,
      links: column.links.map(link => ({
        label: `${link.label}~`,
        href: link.href,
      })),
    }));
    expect(buildSharedFooter(i18n).columns).toEqual(translated);
  });
});
