import {WEB_APP_BASE_URL} from '@eciperay/client';
import {fireEvent, waitFor} from '@testing-library/react-native';
import {Linking} from 'react-native';

import {makeRecipeDetail} from '../__tests__/fixtures/recipe';
import {renderWithProviders} from '../__tests__/testUtils';

import {SharedRecipeListCard} from './SharedRecipeListCard';

describe('SharedRecipeListCard', () => {
  test('opens the public recipe URL', async () => {
    const recipe = makeRecipeDetail({
      id: 'recipe-1',
      slug: 'my-recipe',
      title: 'My Recipe',
      servings: 4,
      cookTimeMin: 30,
    });
    const {getByText} = await renderWithProviders(
      <SharedRecipeListCard recipe={recipe} />,
    );
    await fireEvent.press(getByText('My Recipe'));
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith(
        `${WEB_APP_BASE_URL}/recipe/recipe-1/my-recipe`,
      );
    });
  });

  test('omits cook time when absent', async () => {
    const recipe = makeRecipeDetail({
      title: 'Salad',
      cookTimeMin: null,
      servings: 2,
    });
    const {getByText, queryByText} = await renderWithProviders(
      <SharedRecipeListCard recipe={recipe} />,
    );
    expect(getByText(/2 servings/)).toBeTruthy();
    expect(queryByText(/min/)).toBeNull();
  });

  test('shows recipe thumbnail when imageUrl is present', async () => {
    const recipe = makeRecipeDetail({
      title: 'Cake',
      imageUrl: 'https://cdn.example/cake.jpg',
    });
    const {getByText, container} = await renderWithProviders(
      <SharedRecipeListCard recipe={recipe} />,
    );
    expect(getByText('Cake')).toBeTruthy();
    expect(container.queryAll(node => node.type === 'Image')[0]).toBeTruthy();
  });
});
