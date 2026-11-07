import {RouteErrorPage} from '@spudly/ui';

type RouteErrorViewProps = {isNotFound: boolean};

/**
 * Presentation for the app-level route error page (eciperay#257). A 404 gets a
 * friendly not-found message; anything else gets a generic something-went-wrong
 * message. Both link back home.
 *
 * Thin host over the design system's RouteErrorPage: the boolean maps onto the
 * page's variant, and the host's established copy is passed through the page's
 * title/message overrides so the wording is unchanged. The page's defaults
 * already cover the home destination ("/") and label ("Go to the home page").
 */
export const RouteErrorView = ({isNotFound}: RouteErrorViewProps) => {
  return (
    <RouteErrorPage
      variant={isNotFound ? 'notFound' : 'error'}
      title={isNotFound ? 'Page not found' : 'Something went wrong'}
      message={
        isNotFound
          ? "The page you're looking for doesn't exist or may have moved."
          : 'An unexpected error occurred while loading this page.'
      }
    />
  );
};
