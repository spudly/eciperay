import {render, screen} from '@testing-library/react-native';

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
  test('renders the showcase picker and filter field', () => {
    render(<ComponentShowcaseView />);

    expect(screen.getByText('Component Showcase')).toBeTruthy();
    expect(screen.getByPlaceholderText('Filter components')).toBeTruthy();
    expect(screen.getByText('Component')).toBeTruthy();
  });
});
