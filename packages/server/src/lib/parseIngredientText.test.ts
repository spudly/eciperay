import {
  parseIngredientAmount,
  parseIngredientText,
} from './parseIngredientText.js';

describe('parseIngredientText', () => {
  test('splits an integer amount and a unit', () => {
    expect(parseIngredientText('2 tbsp lemon juice, fresh')).toEqual({
      quantity: 2,
      unit: 'tbsp',
      name: 'lemon juice, fresh',
      notes: null,
    });
  });

  test('splits a fraction amount', () => {
    expect(parseIngredientText('1/4 cup dill, fresh chopped')).toEqual({
      quantity: 0.25,
      unit: 'cup',
      name: 'dill, fresh chopped',
      notes: null,
    });
  });

  test('splits a mixed-number amount', () => {
    expect(parseIngredientText('1 1/2 cups flour')).toEqual({
      quantity: 1.5,
      unit: 'cups',
      name: 'flour',
      notes: null,
    });
  });

  test('splits a decimal amount', () => {
    expect(parseIngredientText('1.5 liters water')).toEqual({
      quantity: 1.5,
      unit: 'liters',
      name: 'water',
      notes: null,
    });
  });

  test('splits a leading-dot decimal amount', () => {
    expect(parseIngredientText('.5 tsp salt')).toEqual({
      quantity: 0.5,
      unit: 'tsp',
      name: 'salt',
      notes: null,
    });
  });

  test('splits an amount with the unit attached (200g)', () => {
    expect(parseIngredientText('200g pasta')).toEqual({
      quantity: 200,
      unit: 'g',
      name: 'pasta',
      notes: null,
    });
  });

  test('keeps a non-unit word after the amount in the name', () => {
    expect(parseIngredientText('6 radishes, quartered')).toEqual({
      quantity: 6,
      unit: null,
      name: 'radishes, quartered',
      notes: null,
    });
    expect(
      parseIngredientText('2 English cucumbers, cut into 1in pieces'),
    ).toEqual({
      quantity: 2,
      unit: null,
      name: 'English cucumbers, cut into 1in pieces',
      notes: null,
    });
  });

  test('treats a size word after the amount as the unit (WPRM style)', () => {
    expect(parseIngredientText('1 medium avocado, pitted and peeled')).toEqual({
      quantity: 1,
      unit: 'medium',
      name: 'avocado, pitted and peeled',
      notes: null,
    });
  });

  test('splits a unicode fraction amount', () => {
    expect(parseIngredientText('½ cup sugar')).toEqual({
      quantity: 0.5,
      unit: 'cup',
      name: 'sugar',
      notes: null,
    });
  });

  test('splits an integer with an attached unicode fraction', () => {
    expect(parseIngredientText('1½ cups flour')).toEqual({
      quantity: 1.5,
      unit: 'cups',
      name: 'flour',
      notes: null,
    });
  });

  test('splits an integer with a spaced unicode fraction', () => {
    expect(parseIngredientText('1 ½ cups flour')).toEqual({
      quantity: 1.5,
      unit: 'cups',
      name: 'flour',
      notes: null,
    });
  });

  test('uses the lower bound of a hyphen range and preserves it in notes', () => {
    expect(parseIngredientText('1-2 tbsp honey')).toEqual({
      quantity: 1,
      unit: 'tbsp',
      name: 'honey',
      notes: '1-2',
    });
  });

  test('uses the lower bound of an en-dash range', () => {
    expect(parseIngredientText('2–3 cloves garlic')).toEqual({
      quantity: 2,
      unit: 'cloves',
      name: 'garlic',
      notes: '2–3',
    });
  });

  test('uses the lower bound of a "to" range', () => {
    expect(parseIngredientText('1 to 2 cups flour')).toEqual({
      quantity: 1,
      unit: 'cups',
      name: 'flour',
      notes: '1 to 2',
    });
  });

  test('does not treat a hyphenated size after an amount as a range', () => {
    expect(parseIngredientText('1-inch piece ginger')).toEqual({
      quantity: 1,
      unit: null,
      name: 'inch piece ginger',
      notes: null,
    });
  });

  test('leaves an ingredient with no amount intact', () => {
    expect(parseIngredientText('Salt and pepper to taste')).toEqual({
      quantity: null,
      unit: null,
      name: 'Salt and pepper to taste',
      notes: null,
    });
    expect(parseIngredientText('Hey Old Sport Overachiever to taste')).toEqual({
      quantity: null,
      unit: null,
      name: 'Hey Old Sport Overachiever to taste',
      notes: null,
    });
  });

  test('leaves a fraction with a zero denominator intact', () => {
    expect(parseIngredientText('1/0 cup flour')).toEqual({
      quantity: null,
      unit: null,
      name: '1/0 cup flour',
      notes: null,
    });
    expect(parseIngredientText('1 1/0 cups flour')).toEqual({
      quantity: null,
      unit: null,
      name: '1 1/0 cups flour',
      notes: null,
    });
  });

  test('leaves an amount that is not a complete token intact', () => {
    expect(parseIngredientText('0,5 l Milch')).toEqual({
      quantity: null,
      unit: null,
      name: '0,5 l Milch',
      notes: null,
    });
    expect(parseIngredientText('1,000 g flour')).toEqual({
      quantity: null,
      unit: null,
      name: '1,000 g flour',
      notes: null,
    });
    expect(parseIngredientText('2% milk')).toEqual({
      quantity: null,
      unit: null,
      name: '2% milk',
      notes: null,
    });
  });

  test('splits a two-word unit (fl oz)', () => {
    expect(parseIngredientText('16 fl oz milk')).toEqual({
      quantity: 16,
      unit: 'fl oz',
      name: 'milk',
      notes: null,
    });
    expect(parseIngredientText('8 fluid ounces milk')).toEqual({
      quantity: 8,
      unit: 'fluid ounces',
      name: 'milk',
      notes: null,
    });
  });

  test('accepts a unit with a trailing period and uppercase letters', () => {
    expect(parseIngredientText('2 TBSP. olive oil')).toEqual({
      quantity: 2,
      unit: 'tbsp',
      name: 'olive oil',
      notes: null,
    });
  });

  test('drops a comma or "of" between the unit and the name', () => {
    expect(parseIngredientText('2 cups, sifted flour')).toEqual({
      quantity: 2,
      unit: 'cups',
      name: 'sifted flour',
      notes: null,
    });
    expect(parseIngredientText('1 cup of flour')).toEqual({
      quantity: 1,
      unit: 'cup',
      name: 'flour',
      notes: null,
    });
  });

  test('keeps a parenthesised size in the name when no unit leads', () => {
    expect(parseIngredientText('1 (14 oz) can diced tomatoes')).toEqual({
      quantity: 1,
      unit: null,
      name: '(14 oz) can diced tomatoes',
      notes: null,
    });
  });

  test('leaves an amount with no name intact', () => {
    expect(parseIngredientText('2 cups')).toEqual({
      quantity: null,
      unit: null,
      name: '2 cups',
      notes: null,
    });
    expect(parseIngredientText('2')).toEqual({
      quantity: null,
      unit: null,
      name: '2',
      notes: null,
    });
  });
});

describe('parseIngredientAmount', () => {
  test('returns null quantity for empty text', () => {
    expect(parseIngredientAmount('')).toEqual({quantity: null, notes: null});
    expect(parseIngredientAmount('   ')).toEqual({quantity: null, notes: null});
  });

  test('returns null quantity for non-numeric text', () => {
    expect(parseIngredientAmount('to taste')).toEqual({
      quantity: null,
      notes: null,
    });
  });

  test('parses integer, fraction, and mixed amounts', () => {
    expect(parseIngredientAmount('2')).toEqual({quantity: 2, notes: null});
    expect(parseIngredientAmount('1/4')).toEqual({quantity: 0.25, notes: null});
    expect(parseIngredientAmount('1 1/2')).toEqual({
      quantity: 1.5,
      notes: null,
    });
  });

  test('returns null quantity for an amount that is not a complete token', () => {
    expect(parseIngredientAmount('0,5')).toEqual({quantity: null, notes: null});
    expect(parseIngredientAmount('2%')).toEqual({quantity: null, notes: null});
  });

  test('parses a range amount to its lower bound with the range in notes', () => {
    expect(parseIngredientAmount('1-2')).toEqual({quantity: 1, notes: '1-2'});
  });
});
