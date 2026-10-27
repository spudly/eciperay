import {render, screen} from '@testing-library/react';
import {vi} from 'vitest';
import {createMemoryRouter, Outlet, RouterProvider} from 'react-router-dom';

import {RouteErrorPage} from './RouteErrorPage.js';

const Boom = (): never => {
  throw new Error('kaboom');
};

const renderWithErrorRoute = (initialPath: string) => {
  const memoryRouter = createMemoryRouter(
    [
      {
        element: <Outlet />,
        errorElement: <RouteErrorPage />,
        children: [
          {path: '/', element: <div>Home</div>},
          {path: '/boom', element: <Boom />},
        ],
      },
    ],
    {initialEntries: [initialPath]},
  );
  return render(<RouterProvider router={memoryRouter} />);
};

describe('RouteErrorPage', () => {
  test('renders a friendly not-found page for an unmatched route', async () => {
    renderWithErrorRoute('/no-such-page');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
    expect(
      screen.getByRole('link', {name: 'Go to the home page'}),
    ).toHaveAttribute('href', '/');
    expect(screen.queryByText(/Unexpected Application Error/)).toBeNull();
  });

  test('renders a generic error page when a route throws', async () => {
    // React Router logs the caught render error to console.error;
    // the shared test setup fails on console.error, so silence it
    // for this expected-error case.
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    renderWithErrorRoute('/boom');
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByRole('link', {name: 'Go to the home page'}),
    ).toHaveAttribute('href', '/');
    consoleError.mockRestore();
  });
});
