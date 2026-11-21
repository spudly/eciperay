import {setupI18n} from '@lingui/core';

import {buildSharedFooter, sharedFooter} from './legalDocumentData.js';

const expectedColumns = [
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
];

describe('sharedFooter', () => {
  test('orders Explore, Account, then Legal with the approved links (#619)', () => {
    expect(sharedFooter.columns).toEqual(expectedColumns);
    expect(sharedFooter.brand).toEqual({label: 'Eciperay', href: '/'});
  });

  test('buildSharedFooter resolves the same structure through i18n', () => {
    const i18n = setupI18n({locale: 'en-US'});
    expect(buildSharedFooter(i18n).columns).toEqual(expectedColumns);
  });
});
