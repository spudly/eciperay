import {ComponentShowcaseView} from '../components/dev/ComponentShowcaseView';

export const ComponentShowcaseScreen = () => {
  if (!__DEV__) {
    return null;
  }

  return <ComponentShowcaseView />;
};
