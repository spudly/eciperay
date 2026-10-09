import {createMealPlansApi} from './mealPlansApi.js';

describe('createMealPlansApi', () => {
  test('calls meal plan endpoints', async () => {
    const fetch = jest.fn().mockResolvedValue({});
    const api = createMealPlansApi({fetch});

    await api.list();
    await api.get('plan-1');
    await api.create({title: 'Week', entries: [{mealId: 'm1'}]});
    await api.put('plan-1', {title: 'Week 2', entries: [{recipeId: 'r1'}]});
    await api.delete('plan-1');
    await api.shoppingList('plan-1');

    expect(fetch).toHaveBeenCalledWith('/meal-plans');
    expect(fetch).toHaveBeenCalledWith('/meal-plans/plan-1');
    expect(fetch).toHaveBeenCalledWith('/meal-plans', {
      method: 'POST',
      body: JSON.stringify({title: 'Week', entries: [{mealId: 'm1'}]}),
    });
    expect(fetch).toHaveBeenCalledWith('/meal-plans/plan-1', {
      method: 'PUT',
      body: JSON.stringify({title: 'Week 2', entries: [{recipeId: 'r1'}]}),
    });
    expect(fetch).toHaveBeenCalledWith('/meal-plans/plan-1', {
      method: 'DELETE',
    });
    expect(fetch).toHaveBeenCalledWith('/meal-plans/plan-1/shopping-list');
  });
});
