import {isRouteErrorResponse, useRouteError} from 'react-router-dom';

import {RouteErrorView} from '../components/RouteErrorView.js';

/**
 * App-level route error page (eciperay#257), wired as the root route's
 * `errorElement`. Without it, react-router renders its raw default error screen
 * ("Unexpected Application Error! … Hey developer 👋") for every unmatched
 * route and thrown render error.
 */
export const RouteErrorPage = () => {
  const error = useRouteError();
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  return <RouteErrorView isNotFound={isNotFound} />;
};
