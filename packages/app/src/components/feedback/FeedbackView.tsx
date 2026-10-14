import type {FeedbackViewProps, ShowcaseDemoRenderer} from '@eciperay/client';
import {Text} from 'react-native';

import {FeedbackForm} from '../FeedbackForm';
import {PageTitle} from '../ui/PageTitle';
import {ScreenContainer} from '../ui/ScreenContainer';

export const FeedbackView = ({route}: FeedbackViewProps) => (
  <ScreenContainer variant="padded">
    <PageTitle spacing="section">Feedback</PageTitle>
    <Text className="text-muted mbe-6 text-sm">
      Share ideas, confusion, or problems. We&apos;ll include session context to
      help us investigate.
    </Text>
    <FeedbackForm route={route} />
  </ScreenContainer>
);

if (__DEV__) {
  const feedbackViewDemo: ShowcaseDemoRenderer = ({Frame}) => (
    <Frame>
      <FeedbackView route="/dev/components" />
    </Frame>
  );
  FeedbackView.demo = feedbackViewDemo;
}
