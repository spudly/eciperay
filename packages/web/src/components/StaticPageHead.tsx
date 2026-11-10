import {buildPublicPageHead} from '@eciperay/client';
import {useMemo} from 'react';

import {PageHead} from './PageHead.js';

type StaticPageHeadProps = {path: string};

// Head for a static public page, from the shared head config (#414).
export const StaticPageHead = ({path}: StaticPageHeadProps) => {
  const config = useMemo(
    () => buildPublicPageHead(window.location.origin, path),
    [path],
  );
  return config ? <PageHead config={config} /> : null;
};
