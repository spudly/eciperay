import {MOBILE_APP_INSTALL_URL} from '@eciperay/client';
import {useLingui} from '@lingui/react';
import {LandingPage} from '@spudly/ui';

import {PublicHeader} from '../components/PublicHeader.js';
import {StaticPageHead} from '../components/StaticPageHead.js';

import {sharedFooter} from './legal/legalDocumentData.js';

// The signed-out landing's host (B7 cluster 11): the design
// system's LandingPage renders the surface (#171) and its own
// footer from the shared footer data (#452 — the DS frame that
// used to wrap it was retired in @spudly/ui 7.0.0); the host
// supplies the header band (PublicHeader) the frame used to
// provide. The copy and the CTA destinations stay app-owned
// content, passed in as data — the three CTAs as {label, href}
// pairs (rendered as link buttons) and the three features in
// the page's fixed slots. The page-unique copy flows through
// the Lingui catalogs (#465 tranche 8: explicit ids
// `landing.heroTitle` / `landing.heroSubtitle` /
// `landing.discoverCta` / `landing.signUpCta` /
// `landing.mobileAppCta` and the per-feature
// `landing.feature{One,Two,Three}{Title,Description}` ids);
// the canonical strings live in @eciperay/client's landingCopy
// (still used for the SEO page-head data), and the catalog
// messages mirror them.
export const MarketingLandingPage = () => {
  const {i18n} = useLingui();
  return (
    <>
      <StaticPageHead path="/" />
      <PublicHeader />
      <LandingPage
        footer={sharedFooter}
        heroTitle={i18n._({
          id: 'landing.heroTitle',
          message: 'Every recipe you love, in one place — ready when you are',
        })}
        heroSubtitle={i18n._({
          id: 'landing.heroSubtitle',
          message:
            'Clip a recipe from anywhere, make it your own with a little AI help, and share the keepers with friends or the whole community.',
        })}
        discoverCta={{
          label: i18n._({
            id: 'landing.discoverCta',
            message: 'Discover public recipes',
          }),
          href: '/recipes',
        }}
        signUpCta={{
          label: i18n._({id: 'landing.signUpCta', message: 'Sign up free'}),
          href: '/signup',
        }}
        getAppCta={{
          label: i18n._({
            id: 'landing.mobileAppCta',
            message: 'Get the mobile app',
          }),
          href: MOBILE_APP_INSTALL_URL,
        }}
        featureOne={{
          title: i18n._({
            id: 'landing.featureOneTitle',
            message: 'Import from anywhere',
          }),
          description: i18n._({
            id: 'landing.featureOneDescription',
            message:
              'Paste a URL, snap a photo, or drop in your notes — AI turns the jumble into a proper recipe.',
          }),
        }}
        featureTwo={{
          title: i18n._({
            id: 'landing.featureTwoTitle',
            message: 'Cook with confidence',
          }),
          description: i18n._({
            id: 'landing.featureTwoDescription',
            message:
              'Scale servings up or down, keep every version, and cook step by step when your hands are busy.',
          }),
        }}
        featureThree={{
          title: i18n._({
            id: 'landing.featureThreeTitle',
            message: 'Share on your terms',
          }),
          description: i18n._({
            id: 'landing.featureThreeDescription',
            message:
              'Keep a recipe to yourself, pass an unlisted link to a friend, or publish it for everyone — your call, every time.',
          }),
        }}
      />
    </>
  );
};
