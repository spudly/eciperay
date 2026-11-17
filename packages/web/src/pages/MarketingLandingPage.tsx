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
          message: 'Your recipes, organized and ready to cook',
        })}
        heroSubtitle={i18n._({
          id: 'landing.heroSubtitle',
          message:
            'Save recipes from anywhere, tweak them with AI, and share what you love with friends or the community.',
        })}
        discoverCta={{
          label: i18n._({
            id: 'landing.discoverCta',
            message: 'Discover public recipes',
          }),
          href: '/discover',
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
              'Paste a URL, photo, or notes and let AI turn it into a structured recipe.',
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
              'Scale servings, track versions, and follow step-by-step cooking mode.',
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
              'Keep recipes private, share unlisted links, or publish to the community.',
          }),
        }}
      />
    </>
  );
};
