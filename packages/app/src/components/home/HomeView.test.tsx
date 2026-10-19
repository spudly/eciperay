import {
  HOME_BROWSE_LABEL,
  HOME_EMPTY_MESSAGE,
  HOME_TITLE,
} from '@eciperay/client';
import {fireEvent} from '@testing-library/react-native';

import {makeRecipeDetail} from '../../__tests__/fixtures/recipe';
import {renderWithProviders} from '../../__tests__/testUtils';

import {HomeView} from './HomeView';

jest.mock('../../lib/api');

describe('HomeView', () => {
  test('renders welcome content and empty state', async () => {
    const {getByText} = await renderWithProviders(
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

    expect(getByText(HOME_TITLE)).toBeTruthy();
    expect(getByText(HOME_BROWSE_LABEL)).toBeTruthy();
    expect(getByText(HOME_EMPTY_MESSAGE)).toBeTruthy();
  });

  test('calls browse callback when browse action is pressed', async () => {
    const onBrowsePress = jest.fn();

    const {getByText} = await renderWithProviders(
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

    await fireEvent.press(getByText(HOME_BROWSE_LABEL));
    expect(onBrowsePress).toHaveBeenCalledTimes(1);
  });

  test('renders recently viewed recipes', async () => {
    const {getByText} = await renderWithProviders(
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

    expect(getByText('Soup')).toBeTruthy();
    expect(getByText('Log cook')).toBeTruthy();
  });
});
