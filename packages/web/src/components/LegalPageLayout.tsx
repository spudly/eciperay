import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';

type LegalPageLayoutProps = {children: ReactNode; title: string};

export const LegalPageLayout = ({children, title}: LegalPageLayoutProps) => {
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
      <main className="mx-auto px-6 py-10 max-inline-3xl">
        <h1 className="mbe-2 text-3xl font-bold text-gray-900">{title}</h1>
        <div className="prose prose-gray text-gray-800 max-inline-none">
          {children}
        </div>
      </main>
    </div>
  );
};
