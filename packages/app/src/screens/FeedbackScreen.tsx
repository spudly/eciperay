import type {NavigationState} from '@react-navigation/native';
import {useNavigationState} from '@react-navigation/native';

import {FeedbackForm} from '../components/FeedbackForm';

const getActiveRouteName = (
  state: NavigationState | undefined,
): string | undefined => {
  if (!state) {
    return undefined;
  }

  const route = state.routes[state.index];
  if (route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }

  return route.name;
};

export const FeedbackScreen = () => {
  const route = useNavigationState(state => getActiveRouteName(state));

  return <FeedbackForm route={route} />;
};
