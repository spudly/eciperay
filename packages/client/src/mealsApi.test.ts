import {createMealsApi} from './mealsApi.js';

describe('createMealsApi', () => {
  test('calls meal endpoints', async () => {
    const fetch = jest.fn().mockResolvedValue({});
    const api = createMealsApi({fetch});

    await api.list();
    await api.get('meal-1');
    await api.create({title: 'Dinner', recipes: [{recipeId: 'r1'}]});
    await api.put('meal-1', {title: 'Lunch', recipes: [{recipeId: 'r1'}]});
    await api.delete('meal-1');
    await api.cookPlan('meal-1');
    await api.cookPlan('meal-1', {refresh: true});

    expect(fetch).toHaveBeenCalledWith('/meals');
    expect(fetch).toHaveBeenCalledWith('/meals/meal-1');
    expect(fetch).toHaveBeenCalledWith('/meals', {
      method: 'POST',
      body: JSON.stringify({title: 'Dinner', recipes: [{recipeId: 'r1'}]}),
    });
    expect(fetch).toHaveBeenCalledWith('/meals/meal-1', {
      method: 'PUT',
      body: JSON.stringify({title: 'Lunch', recipes: [{recipeId: 'r1'}]}),
    });
    expect(fetch).toHaveBeenCalledWith('/meals/meal-1', {method: 'DELETE'});
    expect(fetch).toHaveBeenCalledWith('/meals/meal-1/cook-plan');
    expect(fetch).toHaveBeenCalledWith('/meals/meal-1/cook-plan?refresh=true');
  });
});
