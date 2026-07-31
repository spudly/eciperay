import {
  LANDING_DISCOVER_CTA,
  LANDING_FEATURES,
  LANDING_HERO_SUBTITLE,
  LANDING_HERO_TITLE,
  LANDING_MOBILE_APP_CTA,
  LANDING_SIGNUP_CTA,
  MOBILE_APP_INSTALL_URL,
} from '@eciperay/client';
import {Link} from 'react-router-dom';

export const MarketingLandingView = () => (
  <>
    <section className="ui-marketing-hero">
      <h1
        className="
          ui-page-title-lg mb-4
          sm:text-4xl
        "
      >
        {LANDING_HERO_TITLE}
      </h1>
      <p className="text-muted mx-auto mb-8 max-w-2xl text-lg">
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
    </section>

    <section className="ui-marketing-feature-grid">
      {LANDING_FEATURES.map(feature => (
        <article
          key={feature.title}
          className="ui-marketing-feature-card"
        >
          <h2 className="mb-2 text-lg font-semibold text-gray-900">
            {feature.title}
          </h2>
          <p className="text-muted text-sm">{feature.description}</p>
        </article>
      ))}
    </section>
  </>
);
