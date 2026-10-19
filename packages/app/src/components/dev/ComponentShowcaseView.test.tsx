import {screen} from '@testing-library/react-native';

import {renderWithProviders} from '../../__tests__/testUtils';

import {ComponentShowcaseView} from './ComponentShowcaseView';

jest.mock('./ShowcaseDemo', () => {
  const React = require('react');
  const {Text} = require('react-native');
  return {
    ShowcaseDemo: ({id}: {id: string}) =>
      React.createElement(Text, {testID: 'showcase-demo'}, id),
  };
});

describe('ComponentShowcaseView', () => {
  test('renders the showcase picker and filter field', async () => {
    await renderWithProviders(<ComponentShowcaseView />);

    expect(screen.getByText('Component Showcase')).toBeTruthy();
    expect(screen.getByPlaceholderText('Filter components')).toBeTruthy();
    expect(screen.getByText('Component')).toBeTruthy();
  });
});
