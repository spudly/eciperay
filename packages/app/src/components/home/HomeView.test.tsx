import {
  HOME_BROWSE_LABEL,
  HOME_EMPTY_MESSAGE,
  HOME_TITLE,
} from '@eciperay/client';
import {fireEvent, render, screen} from '@testing-library/react-native';

import {makeRecipeDetail} from '../../__tests__/fixtures/recipe';

import {HomeView} from './HomeView';

describe('HomeView', () => {
  test('renders welcome content and empty state', () => {
    render(
      <HomeView
        isLoading={false}
        recipes={[]}
        onBrowsePress={jest.fn()}
        onAddPress={jest.fn()}
        onSharedWithMePress={jest.fn()}
        onRecipePress={jest.fn()}
        onRecipeDelete={jest.fn()}
      />,
    );

    expect(screen.getByText(HOME_TITLE)).toBeTruthy();
    expect(screen.getByText(HOME_BROWSE_LABEL)).toBeTruthy();
    expect(screen.getByText(HOME_EMPTY_MESSAGE)).toBeTruthy();
  });

  test('calls browse callback when browse action is pressed', () => {
    const onBrowsePress = jest.fn();

    render(
      <HomeView
        isLoading={false}
        recipes={[]}
        onBrowsePress={onBrowsePress}
        onAddPress={jest.fn()}
        onSharedWithMePress={jest.fn()}
        onRecipePress={jest.fn()}
        onRecipeDelete={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText(HOME_BROWSE_LABEL));
    expect(onBrowsePress).toHaveBeenCalledTimes(1);
  });

  test('renders recently viewed recipes', () => {
    render(
      <HomeView
        isLoading={false}
        recipes={[makeRecipeDetail({id: 'recipe-1', title: 'Soup'})]}
        onBrowsePress={jest.fn()}
        onAddPress={jest.fn()}
        onSharedWithMePress={jest.fn()}
        onRecipePress={jest.fn()}
        onRecipeDelete={jest.fn()}
      />,
    );

    expect(screen.getByText('Soup')).toBeTruthy();
  });
});
