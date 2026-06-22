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

import {PublicPageLayout} from '../components/PublicPageLayout.js';

export const MarketingLandingPage = () => (
  <PublicPageLayout>
    <section className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
      <h1 className="
        mb-4 text-3xl font-bold text-gray-900
        sm:text-4xl
      ">
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

    <section className="
      mt-8 grid gap-4
      sm:grid-cols-3
    ">
      {LANDING_FEATURES.map(feature => (
        <article
          key={feature.title}
          className="rounded-xl bg-white p-5 shadow-sm"
        >
          <h2 className="mb-2 text-lg font-semibold text-gray-900">
            {feature.title}
          </h2>
          <p className="text-muted text-sm">{feature.description}</p>
        </article>
      ))}
    </section>
  </PublicPageLayout>
);
