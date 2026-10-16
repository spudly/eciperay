import type {FeedbackViewProps, ShowcaseDemoRenderer} from '@eciperay/client';
import {Text as DsText, tokens} from '@spudly/ui';

import {FeedbackForm} from '../FeedbackForm';
import {PageTitle} from '../ui/PageTitle';
import {ScreenContainer} from '../ui/ScreenContainer';

export const FeedbackView = ({route}: FeedbackViewProps) => (
  <ScreenContainer variant="padded">
    <PageTitle spacing="section">Feedback</PageTitle>
    <DsText
      color="$textMuted"
      marginBlockEnd="$6"
      fontSize={tokens.typography.fontSize.sm}
    >
      Share ideas, confusion, or problems. We&apos;ll include session context to
      help us investigate.
    </DsText>
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
