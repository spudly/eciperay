import {makeIngredient} from '../test/fixtures/ingredient.js';
import {makePublicRecipeResponse} from '../test/fixtures/publicRecipeResponse.js';
import {makeTag} from '../test/fixtures/tag.js';

import {buildPublicRecipePageProps} from './buildPublicRecipePageProps.js';

describe('buildPublicRecipePageProps', () => {
  test('maps the ready state for an anonymous first paint', () => {
    const props = buildPublicRecipePageProps(makePublicRecipeResponse());

    expect(props.state).toBe('ready');
    if (props.state !== 'ready') {
      return;
    }
    expect(props.overview).toEqual({
      imageUrl: null,
      title: 'Test Recipe',
      description: 'A test recipe',
      status: 'idea',
      servingsLabel: '4',
      prepTimeLabel: '15m',
      cookTimeLabel: '30m',
      tags: [{id: 'tag-uuid-1', name: 'Dinner', color: 'indigo'}],
    });
    expect(props.ctas).toEqual({variant: 'signedOut'});
    expect(props.ingredients.servings).toBe(4);
    expect(props.ingredients.scaleValue).toBe('1');
    expect(props.ingredients.ingredients).toEqual([
      {
        id: 'ingredient-uuid-1',
        label: '2 cups Flour',
        isOptional: false,
        isMissing: false,
      },
    ]);
    expect(props.ingredients.loadingSubstitutions).toBe(false);
    expect(props.ingredients.substitutions).toEqual([]);
    expect(props.instructions).toEqual({
      instructions: [
        {
          id: 'instruction-uuid-1',
          stepNumber: 1,
          body: 'Mix the ingredients together.',
        },
      ],
    });
    expect(props.ratings).toEqual({community: null, viewer: null});
    expect(props.footer?.brand).toEqual({label: 'Eciperay', href: '/'});
  });

  test('omits time labels when the recipe has no prep/cook times and maps the community rating', () => {
    const body = makePublicRecipeResponse({
      communityRating: {average: 4.4, count: 12, hasStaleRatings: true},
    });
    body.recipe = {
      ...body.recipe,
      prepTimeMin: null,
      cookTimeMin: null,
      tags: [makeTag({color: '#000000'})],
      ingredients: [
        makeIngredient({
          id: 'second',
          sortOrder: 2,
          name: 'Sugar',
          quantity: null,
          unit: null,
        }),
        makeIngredient({id: 'first', sortOrder: 1}),
      ],
    };

    const props = buildPublicRecipePageProps(body);

    expect(props.state).toBe('ready');
    if (props.state !== 'ready') {
      return;
    }
    expect(props.overview.prepTimeLabel).toBeUndefined();
    expect(props.overview.cookTimeLabel).toBeUndefined();
    // Ingredients come back in sortOrder order, unscaled at SSR.
    expect(props.ingredients.ingredients.map(i => i.id)).toEqual([
      'first',
      'second',
    ]);
    expect(props.ingredients.ingredients[1]?.label).toBe('Sugar');
    expect(props.ratings?.community).toEqual({
      stars: '★★★★',
      label: '4.4 (12)',
      hasStaleRatings: true,
    });
  });

  test('intent callbacks are inert no-ops', () => {
    const props = buildPublicRecipePageProps(makePublicRecipeResponse());

    expect(props.state).toBe('ready');
    if (props.state !== 'ready') {
      return;
    }
    expect(() => {
      props.onSignUpPress();
      props.onClonePress();
      props.onGetAppPress();
      props.onViewerRatingChange?.(5);
      props.ingredients.onServingsChange(8);
      props.ingredients.onScaleChange('2');
      props.ingredients.onIngredientPress?.('ingredient-uuid-1');
    }).not.toThrow();
  });
});
