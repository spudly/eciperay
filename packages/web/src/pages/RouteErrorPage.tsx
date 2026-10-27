import {isRouteErrorResponse, Link, useRouteError} from 'react-router-dom';

import {PageTitle} from '../components/ui/PageTitle.js';

/**
 * App-level route error page (eciperay#257), wired as the root route's
 * `errorElement`. Without it, react-router renders its raw default error screen
 * ("Unexpected Application Error! … Hey developer 👋") for every unmatched
 * route and thrown render error. A 404 gets a friendly not-found message;
 * anything else gets a generic something-went-wrong message. Both link back
 * home.
 */
export const RouteErrorPage = () => {
  const error = useRouteError();
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

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
