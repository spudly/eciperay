import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';

type PublicPageLayoutProps = {children: ReactNode};

export const PublicPageLayout = ({children}: PublicPageLayoutProps) => {
  return (
    <div className="bg-gray-50 min-block-screen">
      <header className="border-be border-gray-200 bg-white">
        <div
          className="
            mx-auto flex items-center justify-between px-6 py-4 max-inline-3xl
          "
        >
          <Link
            to="/"
            className="text-primary text-lg font-semibold"
          >
            Eciperay
          </Link>
          <Link
            to="/login"
            className="text-sm font-medium text-gray-700"
          >
            Sign in
          </Link>
        </div>
      </header>
      <main
        className="
          mx-auto px-4 py-6 max-inline-3xl
          sm:px-6
        "
      >
        {children}
      </main>
      <footer className="border-te border-gray-200 bg-white">
        <div
          className="
            mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-4
            text-sm text-gray-600 max-inline-3xl
          "
        >
          <p>Recipes shared on Eciperay may be viewed without an account.</p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/privacy"
              className="text-primary font-medium"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-primary font-medium"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
