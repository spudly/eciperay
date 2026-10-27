import {Link} from 'react-router-dom';

import {PageTitle} from './ui/PageTitle.js';

type RouteErrorViewProps = {isNotFound: boolean};

/**
 * Presentation for the app-level route error page (eciperay#257). A 404 gets a
 * friendly not-found message; anything else gets a generic something-went-wrong
 * message. Both link back home.
 */
export const RouteErrorView = ({isNotFound}: RouteErrorViewProps) => {
  return (
    <main className="mx-auto px-6 py-10 max-inline-3xl">
      <PageTitle>
        {isNotFound ? 'Page not found' : 'Something went wrong'}
      </PageTitle>
      <p className="text-base/relaxed text-gray-700">
        {isNotFound
          ? "The page you're looking for doesn't exist or may have moved."
          : 'An unexpected error occurred while loading this page.'}
      </p>
      <p className="mbe-8 text-base/relaxed text-gray-700">
        <Link
          to="/"
          className="text-primary font-medium"
        >
          Go to the home page
        </Link>
      </p>
    </main>
  );
};
