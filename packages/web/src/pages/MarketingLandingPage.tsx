import {
  LANDING_DISCOVER_CTA,
  LANDING_FEATURES,
  LANDING_HERO_SUBTITLE,
  LANDING_HERO_TITLE,
  LANDING_MOBILE_APP_CTA,
  LANDING_SIGNUP_CTA,
  MOBILE_APP_INSTALL_URL,
} from '@eciperay/client';
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
// the page's fixed slots.
export const MarketingLandingPage = () => {
  const [featureOne, featureTwo, featureThree] = LANDING_FEATURES;
  return (
    <>
      <StaticPageHead path="/" />
      <PublicHeader />
      <LandingPage
        footer={sharedFooter}
        heroTitle={LANDING_HERO_TITLE}
        heroSubtitle={LANDING_HERO_SUBTITLE}
        discoverCta={{label: LANDING_DISCOVER_CTA, href: '/discover'}}
        signUpCta={{label: LANDING_SIGNUP_CTA, href: '/signup'}}
        getAppCta={{
          label: LANDING_MOBILE_APP_CTA,
          href: MOBILE_APP_INSTALL_URL,
        }}
        featureOne={featureOne}
        featureTwo={featureTwo}
        featureThree={featureThree}
      />
    </>
  );
};
