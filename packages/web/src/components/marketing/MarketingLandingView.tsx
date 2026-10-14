import {
  LANDING_DISCOVER_CTA,
  LANDING_FEATURES,
  LANDING_HERO_SUBTITLE,
  LANDING_HERO_TITLE,
  LANDING_MOBILE_APP_CTA,
  LANDING_SIGNUP_CTA,
  MOBILE_APP_INSTALL_URL,
} from '@eciperay/client';
import {Card, Text as DSText} from '@spudly/ui';
import {Link} from 'react-router-dom';

export const MarketingLandingView = () => (
  <>
    <Card
      paddingHorizontal="$6"
      paddingVertical="$12"
      alignItems="center"
    >
      <DSText
        variant="heading"
        marginBottom="$4"
        textAlign="center"
      >
        {LANDING_HERO_TITLE}
      </DSText>
      <p className="text-muted mx-auto mbe-8 text-lg max-inline-2xl">
        {LANDING_HERO_SUBTITLE}
      </p>
      <div
        className="
          flex flex-col items-center justify-center gap-3
          sm:flex-row
        "
      >
        <Link
          to="/discover"
          className="bg-primary rounded-xl px-6 py-3 font-semibold text-white"
        >
          {LANDING_DISCOVER_CTA}
        </Link>
        <Link
          to="/signup"
          className="
            rounded-xl border border-gray-200 bg-white px-6 py-3 font-semibold
            text-gray-800
          "
        >
          {LANDING_SIGNUP_CTA}
        </Link>
        <a
          href={MOBILE_APP_INSTALL_URL}
          className="
            rounded-xl border border-gray-200 bg-white px-6 py-3 font-semibold
            text-gray-800
          "
        >
          {LANDING_MOBILE_APP_CTA}
        </a>
      </div>
    </Card>

    <div
      className="
        mbs-8 grid gap-4
        sm:grid-cols-3
      "
    >
      {LANDING_FEATURES.map(feature => (
        <Card
          key={feature.title}
          padding="$5"
        >
          <DSText
            variant="subheading"
            marginBottom="$2"
          >
            {feature.title}
          </DSText>
          <DSText
            variant="hint"
          >
            {feature.description}
          </DSText>
        </Card>
      ))}
    </div>
  </>
);
