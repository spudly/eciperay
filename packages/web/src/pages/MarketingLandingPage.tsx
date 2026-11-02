import {
  LANDING_DISCOVER_CTA,
  LANDING_FEATURES,
  LANDING_HERO_SUBTITLE,
  LANDING_HERO_TITLE,
  LANDING_MOBILE_APP_CTA,
  LANDING_SIGNUP_CTA,
  MOBILE_APP_INSTALL_URL,
} from '@eciperay/client';
import {LandingPage, PublicPageFrame} from '@spudly/ui/pages';

// The signed-out landing's host (B7 cluster 11): the design
// system's LandingPage renders the surface (#171) inside the DS
// PublicPageFrame; the copy and the CTA destinations stay
// app-owned content, passed in as data — the three CTAs as
// {label, href} pairs (rendered as link buttons) and the three
// features in the page's fixed slots.
export const MarketingLandingPage = () => {
  const [featureOne, featureTwo, featureThree] = LANDING_FEATURES;
  return (
    <PublicPageFrame
      brandHref="/"
      signInHref="/login"
      privacyHref="/privacy"
      termsHref="/terms"
    >
      <LandingPage
        heroTitle={LANDING_HERO_TITLE}
        heroSubtitle={LANDING_HERO_SUBTITLE}
        discoverCta={{label: LANDING_DISCOVER_CTA, href: '/discover'}}
        signUpCta={{label: LANDING_SIGNUP_CTA, href: '/signup'}}
        getAppCta={{label: LANDING_MOBILE_APP_CTA, href: MOBILE_APP_INSTALL_URL}}
        featureOne={featureOne}
        featureTwo={featureTwo}
        featureThree={featureThree}
      />
    </PublicPageFrame>
  );
};
