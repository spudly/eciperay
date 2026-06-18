import type {ReactNode} from 'react';

import {LegalPageLayout} from './LegalPageLayout.js';

export type LegalSection = {title: string; content: ReactNode};

type LegalDocumentPageProps = {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export const LegalDocumentPage = ({
  title,
  lastUpdated,
  sections,
}: LegalDocumentPageProps) => {
  return (
    <LegalPageLayout title={title}>
      <p className="text-muted mbe-8 text-sm">Last updated: {lastUpdated}</p>
      <div className="space-y-8">
        {sections.map(section => (
          <section key={section.title}>
            <h2 className="mbe-3 text-xl font-semibold text-gray-900">
              {section.title}
            </h2>
            <div className="space-y-3 text-base/relaxed text-gray-700">
              {section.content}
            </div>
          </section>
        ))}
      </div>
    </LegalPageLayout>
  );
};
