import { matchInstructionIngredients } from './matchInstructionIngredients';

const ingredients = [
  { id: 'ing-onion', name: 'yellow onion' },
  { id: 'ing-garlic', name: 'garlic' },
  { id: 'ing-olive-oil', name: 'olive oil' },
  { id: 'ing-chicken', name: 'chicken breast' },
  { id: 'ing-tomato', name: 'tomatoes' },
  { id: 'ing-parsley', name: 'fresh parsley' },
];

describe('matchInstructionIngredients', () => {
  it('links ingredients explicitly mentioned in a step', () => {
    const { referencesByInstructionId } = matchInstructionIngredients(ingredients, [
      { id: 'step-1', body: 'Heat the olive oil in a large pan.' },
      { id: 'step-2', body: 'Add the yellow onion and garlic; cook until soft.' },
    ]);
    expect(referencesByInstructionId.get('step-1')).toEqual(['ing-olive-oil']);
    expect(referencesByInstructionId.get('step-2')).toEqual(['ing-onion', 'ing-garlic']);
  });

  it('is singular/plural tolerant in both directions', () => {
    const { referencesByInstructionId } = matchInstructionIngredients(ingredients, [
      { id: 'step-1', body: 'Stir in the tomato and cook down.' },
      { id: 'step-2', body: 'Slice the onions thinly.' },
    ]);
    expect(referencesByInstructionId.get('step-1')).toEqual(['ing-tomato']);
    expect(referencesByInstructionId.get('step-2')).toEqual(['ing-onion']);
  });

  it('drops preparation words from ingredient names before matching', () => {
    const { referencesByInstructionId } = matchInstructionIngredients(
      [{ id: 'ing-1', name: 'finely chopped onion' }],
      [{ id: 'step-1', body: 'Add the onion to the pan.' }],
    );
    expect(referencesByInstructionId.get('step-1')).toEqual(['ing-1']);
  });

  it('requires every significant token of a multi-word name', () => {
    const { referencesByInstructionId } = matchInstructionIngredients(ingredients, [
      { id: 'step-1', body: 'Pour in the chicken stock and bring to a boil.' },
    ]);
    expect(referencesByInstructionId.get('step-1')).toEqual([]);
  });

  it('lets one ingredient be referenced by several steps', () => {
    const { referencesByInstructionId, unreferencedIngredientIds } =
      matchInstructionIngredients(ingredients, [
        { id: 'step-1', body: 'Season the chicken breast with salt.' },
        { id: 'step-2', body: 'Rest the chicken breast before slicing.' },
      ]);
    expect(referencesByInstructionId.get('step-1')).toEqual(['ing-chicken']);
    expect(referencesByInstructionId.get('step-2')).toEqual(['ing-chicken']);
    expect(unreferencedIngredientIds).not.toContain('ing-chicken');
  });

  it('reports ingredients no step referenced, in list order', () => {
    const { unreferencedIngredientIds } = matchInstructionIngredients(ingredients, [
      { id: 'step-1', body: 'Heat the olive oil.' },
    ]);
    expect(unreferencedIngredientIds).toEqual([
      'ing-onion',
      'ing-garlic',
      'ing-chicken',
      'ing-tomato',
      'ing-parsley',
    ]);
  });

  it('returns an empty reference list for steps that mention nothing', () => {
    const { referencesByInstructionId } = matchInstructionIngredients(ingredients, [
      { id: 'step-1', body: 'Preheat the oven to 200°C.' },
    ]);
    expect(referencesByInstructionId.get('step-1')).toEqual([]);
  });
});
