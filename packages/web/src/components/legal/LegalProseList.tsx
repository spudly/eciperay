import type {ReactNode} from 'react';

type LegalProseListProps = {children: ReactNode};

export const LegalProseList = ({children}: LegalProseListProps) => (
  <ul className="list-disc space-y-2 ps-6">{children}</ul>
);
