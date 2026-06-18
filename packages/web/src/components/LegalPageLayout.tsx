import type {ReactNode} from 'react';
import {Link} from 'react-router-dom';

type LegalPageLayoutProps = {children: ReactNode; title: string};

export const LegalPageLayout = ({children, title}: LegalPageLayoutProps) => {
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
      <main className="max-inline-3xl mx-auto px-6 py-10">
        <h1 className="mbe-2 text-3xl font-bold text-gray-900">{title}</h1>
        <div className="prose prose-gray max-inline-none text-gray-800">
          {children}
        </div>
      </main>
    </div>
  );
};
