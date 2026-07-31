import type {ReactNode} from 'react';

type LegalProseListProps = {children: ReactNode};

export const LegalProseList = ({children}: LegalProseListProps) => (
  <ul className="ui-legal-prose-list">{children}</ul>
);
