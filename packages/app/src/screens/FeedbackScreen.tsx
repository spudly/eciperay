import type {NavigationState} from '@react-navigation/native';
import {useNavigationState} from '@react-navigation/native';
import {Text, View} from 'react-native';

import {FeedbackForm} from '../components/FeedbackForm.js';

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

  return (
    <View className="flex-1 bg-gray-50 px-6 pt-8">
      <Text className="mb-2 text-2xl font-bold text-gray-900">Feedback</Text>
      <Text className="text-muted mb-6 text-sm">
        Share ideas, confusion, or problems. We&apos;ll include session context
        to help us investigate.
      </Text>
      <FeedbackForm route={route} />
    </View>
  );
};
