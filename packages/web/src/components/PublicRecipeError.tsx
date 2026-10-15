import {PublicPageLayout} from './PublicPageLayout.js';

type PublicRecipeErrorProps = {title: string; message: string};

export const PublicRecipeError = ({title, message}: PublicRecipeErrorProps) => (
  <PublicPageLayout>
    <div className="rounded-xl bg-white p-8 text-center shadow-sm">
      <h1 className="mbe-2 text-xl font-semibold text-gray-900">{title}</h1>
      <p className="text-gray-600">{message}</p>
    </div>
  </PublicPageLayout>
);
