import type {CSSProperties} from 'react';
import {eciperayTheme, Text} from '@spudly/ui';
import {Link} from 'react-router-dom';

import {PageTitle} from './ui/PageTitle.js';

type RouteErrorViewProps = {isNotFound: boolean};

const mainStyle: CSSProperties = {
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: 24,
  paddingRight: 24,
  paddingTop: 40,
  paddingBottom: 40,
  maxWidth: 768,
};

const homeLinkStyle: CSSProperties = {
  color: eciperayTheme.semantic.primary,
  fontWeight: 500,
  textDecoration: 'none',
};

/**
 * Presentation for the app-level route error page (eciperay#257). A 404 gets a
 * friendly not-found message; anything else gets a generic something-went-wrong
 * message. Both link back home.
 */
export const RouteErrorView = ({isNotFound}: RouteErrorViewProps) => {
  return (
    <main style={mainStyle}>
      <PageTitle>
        {isNotFound ? 'Page not found' : 'Something went wrong'}
      </PageTitle>
      <Text style={{lineHeight: 1.625}}>
        {isNotFound
          ? "The page you're looking for doesn't exist or may have moved."
          : 'An unexpected error occurred while loading this page.'}
      </Text>
      <Text
        style={{lineHeight: 1.625, marginBottom: 32, marginTop: 12}}
      >
        <Link
          to="/"
          style={homeLinkStyle}
        >
          Go to the home page
        </Link>
      </Text>
    </main>
  );
};
