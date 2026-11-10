import {buildAuthenticatedPageHead} from '@eciperay/client';
import {useMemo} from 'react';

import {PageHead} from './PageHead.js';

// Head for the authenticated app shell (#414): title + noindex only,
// no social cards — applied once by the shell for every signed-in page.
export const AuthenticatedPageHead = () => {
  const config = useMemo(() => buildAuthenticatedPageHead(), []);
  return <PageHead config={config} />;
};
