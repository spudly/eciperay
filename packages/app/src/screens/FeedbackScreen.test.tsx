import {screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithProviders} from '../__tests__/testUtils';

import {FeedbackScreen} from './FeedbackScreen';

const mockUseNavigationState = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigationState: (selector: (state: unknown) => string | undefined) =>
    mockUseNavigationState(selector),
}));

jest.mock('../components/FeedbackForm.js', () => {
  const ReactNative =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    FeedbackForm: ({route}: {route?: string}) => (
      <ReactNative.Text testID="feedback-form-route">
        {route ?? 'none'}
      </ReactNative.Text>
    ),
  };
});

describe('FeedbackScreen', () => {
  test('passes the active route to the feedback form', async () => {
    mockUseNavigationState.mockImplementation(selector =>
      selector({routes: [{name: 'FeedbackHome'}], index: 0}),
    );
    await renderWithProviders(<FeedbackScreen />);
    expect(screen.getByTestId('feedback-form-route')).toHaveTextContent(
      'FeedbackHome',
    );
  });

  test('handles nested navigation state', async () => {
    mockUseNavigationState.mockImplementation(selector =>
      selector({
        routes: [
          {name: 'Root', state: {routes: [{name: 'NestedFeedback'}], index: 0}},
        ],
        index: 0,
      }),
    );
    await renderWithProviders(<FeedbackScreen />);
    expect(screen.getByTestId('feedback-form-route')).toHaveTextContent(
      'NestedFeedback',
    );
  });

  test('returns no route when navigation state is missing', async () => {
    mockUseNavigationState.mockImplementation(selector => selector());
    await renderWithProviders(<FeedbackScreen />);
    expect(screen.getByTestId('feedback-form-route')).toHaveTextContent('none');
  });
});
