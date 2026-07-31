import {Navigate} from 'react-router-dom';

import {ComponentShowcaseView} from '../components/dev/ComponentShowcaseView.js';

export const ComponentShowcasePage = () => {
  if (!import.meta.env.DEV) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return <ComponentShowcaseView />;
};
