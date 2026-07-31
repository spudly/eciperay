import type {FeedbackViewProps, ShowcaseFrameProps} from '@eciperay/client';
import type {ComponentType} from 'react';

import {FeedbackForm} from '../FeedbackForm.js';
import {FormScreenLayout} from '../ui/FormScreenLayout.js';

export const FeedbackView = ({route, onSubmitted}: FeedbackViewProps) => (
  <FormScreenLayout
    title="Feedback"
    description="Share ideas, confusion, or problems. We'll include session context to help us investigate."
  >
    <FeedbackForm
      route={route}
      onSubmitted={onSubmitted}
    />
  </FormScreenLayout>
);

if (import.meta.env.DEV) {
  FeedbackView.demo = function FeedbackViewDemo({
    Frame,
  }: {
    Frame: ComponentType<ShowcaseFrameProps>;
  }) {
    return (
      <Frame>
        <FeedbackView route="/dev/components" />
      </Frame>
    );
  };
}
