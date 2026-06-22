import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';

type PublicPageLayoutProps = {children: ReactNode};

export const PublicPageLayout = ({children}: PublicPageLayoutProps) => {
  return (
    <div className="min-block-screen bg-gray-50">
      <header className="border-be border-gray-200 bg-white">
        <div
          className="
            max-inline-3xl mx-auto flex items-center justify-between px-6 py-4
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
          max-inline-3xl mx-auto px-4 py-6
          sm:px-6
        "
      >
        {children}
      </main>
      <footer className="border-te border-gray-200 bg-white">
        <div
          className="
            max-inline-3xl mx-auto flex flex-wrap items-center justify-between
            gap-3 px-6 py-4 text-sm text-gray-600
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
